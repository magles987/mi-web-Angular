
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument, AngularFirestoreCollectionGroup, DocumentChangeAction } from '@angular/fire/firestore';
import { Observable, observable, Subject, BehaviorSubject, from, fromEvent, of, Subscription, interval, timer, combineLatest, empty } from 'rxjs';
import { map, switchMap, mergeAll, concatAll, concatMap, mergeMap, mapTo, toArray, concat, skip } from 'rxjs/operators';

//permite crear los _ids personalizados
import { IMetaCampo, IMetaColeccion, Model_Meta } from './meta_Util';
import { Fs_Util } from './fs_Util';
import { IValuesQuery, IHooksService } from '../IModels-Hooks-Querys/_IShared';
import { Fs_MServiceHandler$, Fs_MServicePathHandler$ } from './fs_ServiceHandler$';
import { IRunFunSuscribe } from '../ServiceHandler$';

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*Fs_HooksService<TModel, TModel_Meta>*/
//clase intermedia para redefinir los metodos hooks de 
//acuerdo a las necesidades de Firestore para hacer referencia 
//en la clase padre de cada ModelService
export abstract class Fs_HooksService<TModel, TModel_Meta> implements IHooksService<TModel> {

    //================================================
    //para todas las implemetaciones referentes a 
    //FS (Firestore) requieren las utilidades Fs_Util
    abstract fs_Util:Fs_Util<TModel, TModel_Meta>;
    
    //================================================
    constructor(){
    }
    //================================================
    //Aqui todas las modificaciones (sobreescrituras)
    //a los metodos declarados en la interfaz global 
    //IHooksService que requieran personalizacion para 
    //Firestore 
    //IMPORTANTE: todo parametro adicional debe se opcional

    abstract preGetDoc(Doc: TModel): TModel;
    abstract preDeleteDoc(_id: string): string ;

    //preModDoc() se le debe añadir parametros de soporte
    //para usar en Firestore como:
    //
    //isStrongUpdate?: para determinar si es editado fuerte
    //
    //path_EmbBase?: ruta base para las subColecciones
    //
    abstract preModDoc(
        Doc:TModel, 
        isCreate: boolean,
        isStrongUpdate?:boolean,
        path_EmbBase?:string
    ):TModel;

    abstract postModDoc(Doc: TModel, isCreate: boolean):void;
    abstract postDeleteDoc(_id: string):void;

}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*Ifs_Filter:*/
//agrega propiedades auxiliares para la construccion de la 
//consulta que son exclusivas para Firestore
export interface Ifs_Filter extends IValuesQuery {
    path_EmbBase?:string | null;
    startDoc?:unknown | null;

    //OBLIGATORIA, contiene la funcion query que se ejecutara para
    //solicitar los docs a firestore de acuerdo a la construccion
    //interna de dicha funcion
    query?:(ref:firebase.firestore.CollectionReference | firebase.firestore.Query, BhFilter:unknown)=>firebase.firestore.CollectionReference | firebase.firestore.Query;

    //contiene un valor enum de EtipoPaginar que indica que tipo
    //de paginacion se requiere
    typePaginate?: ETypePaginate;

    //contiene el path de la coleccion o subcoleccion
    pathCollection?: string;

    //determina si se requiere usar subCollectionGroup
    //que son querys especiales que agrupan todas las subcolecciones
    //con el mismo nombre de una coleccion o subcoleccion padre
    isCollectionGroup?:boolean;    
}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*ETypePaginate*/
//establece los tipos basicos de paginacion para firestore, se debe
//tener en cuenta que paginar no es lo mismo que limitar
//TODA query debe tener asignado un limite, esto no significa que toda
//query requiera paginarse
export enum ETypePaginate {

    //indica que la consulta no se pagina (ideal para consultas que se
    //sabe que devuelve 1 solo doc o para querys muy especificas
    //(como ultimoDoc$))
    No = 1, //para que no inicie en 0

    //Paginacion basica que solo requiere de 1 observable del handler$
    //permite direccion de paginacion  "previo" || "siguiente", 
    //esta opcion NO deja copia de los docs leidos nativamente que 
    //no se esten rastreando,si se desea este comportamiento tendria 
    //que hacerse afuera del servicio
    Single,

    //Paginacion que acumula el limite de lectura del query y asi devolver
    //en cada paginacion la cantidad de docs previamente leidos + la nueva pagina
    //Solo permite direccion de paginacion "siguiente"
    //IMPORTANTE: este tipo de paginacion es el que consume mas lecturas en firestore
    //porque relee y rastrea TODOS los docs que se hallan paginado hasta el momento
    Accumulative,

    //Paginacion especial que crea un handler$ por cada pagina que se solicite,
    //permite monitorear TODOS los documentos previamente leidos y se
    //autogestiona para detectar duplicados y ahorro de momoria cuando
    // los observables estan monitoreando vacios[].
    //Esta paginacion solo permite la direccion de paginacion "siguiente"
    Full
}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*ETypePaginatePopulate*/
//tipos basicos para la paginacion de poblar
export enum ETypePaginatePopulate {

    //no se pagina con lo cual quiere decir que se 
    //han leido y rastreado todos los docs a poblar
    No  = 1, //para que no inicie en 0

    //se pagina y rastrea solo los docs a poblar 
    //que esten en la pagina actual, NO se deja copia
    //de los docs que se hallan leido en otras paginas
    Single,

    //se pagina y rastrea solo los docs a poblar 
    //que esten en la pagina actual, solo se puede paginar
    //a siguiente y deja copia de los docs anteriores
    // (pero no se rastrean)
    AccumulativePasive,

    //se pagina y se rastrea TODOS los docs a poblar 
    //que se vayan leyendo
    Full
}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*FSModelService*/
//es una especie de clase abstracta que no es un servicio (no se inyecta)
//simplemente intenta factorizar funcionalidad (metodos especialmente) a los
//services reales que se usarán, esta clase es padre de todos los services
// que se dediquen a CRUD de docs de firebase
//
//como los CRUD en general de angular (especialmente las lecturas) usan 
//la libreria RXjs, se decidio dejar la administracion de lo referente 
//a observables, subjets, behaviors, subscripciones, en manos de objetos 
//derivados de la clase   ServiceHandler$  (y sus hijas) y usar  
//maps diccionarios y keysHandlers para acceder a dichas funcionalidades   
//
//Tipado de Clase:
//
//TModel:
//hace referencia a la CLASE modelo generica
//
//
//TModel_Meta:
//Hace referencia los metadatos del modelo
//
//Ifs_FilterModel:
//tipado que representa el objeto de filtrado COMPLETO 
//del modelo, aunque para esta clase padre se usara en 
//la mayoria de ocasiones un   cast   a   Ifs_Filter 
//(declarado en este mismo archivo) con las propiedades 
//necesarias a usar dentro de esta clase, por lo demas 
//Ifs_FilterModel es solo referencial

//================================================================================================================================
export class Fs_ModelService<TModel, TModel_Meta, Ifs_FilterModel> {

    //================================================================
    /*Propiedades Principales */
    //U_afs:
    //objeto referencial a BD de firestore, el objeto se DEBE DECLARAR
    //en cada service que herede de esta clase, ya que el  _afs  original
    //es inyectable, y se debe pasar a esta clase como referencia en el
    //constructor del service hijo.
    //IMPORTANTE: se inicializa en la clase hija Modelservice
    protected U_afs: AngularFirestore;

    //================================================================
    //IMPORTANTE: esta propiedades DEBEN inicializarse en las clases 
    //hijas de ModelService

    //contiene metadata del modelo
    public Model_Meta:TModel_Meta;
    //utilidades para el manejo de consultas y docs
    public _Util:Fs_Util<TModel, TModel_Meta>;

    //contiene una copia para uso interno de los hooks
    protected hooksInsideService:Fs_HooksService<TModel, TModel_Meta>;

    //================================================================

    //Flag que determina cuando esta listo el servicio para
    //realizar operaciones CRUD
    protected isServiceReady:Boolean;

    //flag que determina si se estan 
    //haciendo pruebas con emulador local de firestore
    private isLocalFS:boolean;

    //almacena un limite de docs leidos estandar para TODAS LAS QUERYS,
    protected defaultPageLimit:number;
    protected defaultLimitPopulate:number;

    //los maps diccionarios para almacenar los distintos 
    //handlers$ (incluso los foraneos)
    private SMapHandlers$:Map<string, Fs_MServiceHandler$<unknown, unknown>>;
    private SMapPathHandlers$:Map<string, Fs_MServicePathHandler$<unknown>>;

    //almacena TODOS los servicios foraneos usados en este servicio
    protected f_services:Fs_ModelService<unknown, unknown, unknown>[];

    //contenedores de keyHandlers  de foraneos que se usan de 
    //forma auxiliar para este ModelService
    protected f_keyHandlersOrPathhandlers$:string[];

    //================================================================
    //
    constructor() {
        this.isServiceReady = false;
        this.defaultPageLimit = 50;
        this.defaultLimitPopulate = 10;
    
        this.SMapHandlers$ = new Map<string, Fs_MServiceHandler$<TModel, Ifs_FilterModel>>();
        this.SMapPathHandlers$ = new Map<string, Fs_MServicePathHandler$<TModel>>();

        this.f_services = [];
        this.f_keyHandlersOrPathhandlers$ = [];

        //Solo para test local debe estar en true:
        this.isLocalFS = false;

    }

    //================================================================================================================================    
    /*createHandler$()*/
    //crea una handler de acuerdo al tipo de necesidad, lo almacena en el
    // map diccionario adecuado y retorna una keyHandler almacenado 
    //en el map
    //
    //Argumentos:
    //
    //RFS: el objeto con las funciones (next, error y complete) a subscribir 
    //en los handlers$
    //
    //keyHandlerType: determina (y se usa como metadata) para 
    //determinar el tipo de handler$ que se desea crear
    //
    //sourceType: metadata que indica el origen donde se declaro 
    //la creacion del handler$ su uso es de caracter informativo
    public createHandler$(        
        RFS:IRunFunSuscribe<TModel[]> | IRunFunSuscribe<TModel>,
        keyHandlerType:"Handler" | "PathHandler",
        sourceType:"Service" | "Component" | "foreingService" | "innerService" | "unknown"  
    ):string{    

        //construir la keyHandler con la que se identificará el handler$ 
        //almacenado en el map diccionario
        const col_Meta = <IMetaColeccion><unknown>this.Model_Meta;
        let prefixKeyHandler = `${col_Meta.__nomColeccion}-${keyHandlerType}`;
        let keyHandler = this._Util.createKeyString(prefixKeyHandler, 8);

        let handler$: Fs_MServiceHandler$<TModel, Ifs_FilterModel> | Fs_MServicePathHandler$<TModel>;

        switch (keyHandlerType) {
            case "Handler":
                //crea el handler con la metadata
                handler$ = new Fs_MServiceHandler$<TModel, Ifs_FilterModel>({
                    keyHandler:keyHandler, 
                    sourceModel:col_Meta.__nomColeccion, 
                    sourceType:sourceType
                });
                //La primera vez se configura en BHFilter como null
                handler$.createBehavior(null);
                handler$.setObservable(this.getObsQueryForHandler(handler$));
                handler$.addSubscribe("START", RFS as IRunFunSuscribe<TModel[]>);
                this.SMapHandlers$.set(keyHandler, handler$);   
                break;
        
            case "PathHandler" :
                //crea el handler con la metadata
                handler$ = new Fs_MServicePathHandler$<TModel>({
                    keyHandler:keyHandler, 
                    sourceModel:col_Meta.__nomColeccion, 
                    sourceType:sourceType
                });
                //La primera vez se configura en BHFilter como null
                handler$.createBehavior(null);
                handler$.setObservable(this.getObsQueryPathHandler(handler$));
                handler$.addSubscribe("START", RFS as IRunFunSuscribe<TModel>);               
                this.SMapPathHandlers$.set(keyHandler, handler$);
                break;

            default:
                keyHandler = undefined;
                break;
        }
        
        return keyHandler;
    }
    //================================================================================================================================    
    /*getHandlerOrPathHandler$()*/
    //devuelve el handler almacenado en el map diccionario de los handlers usados
    //puede servir para agregar funcionalidades adicionales a dicho handler$
    protected getHandlerOrPathHandler$(
        keyHandlerOrPathHandler:string
    ):Fs_MServiceHandler$<unknown, unknown> | Fs_MServicePathHandler$<unknown>{    
        if (this.isTypeHandler(keyHandlerOrPathHandler, "Handler")) {
            return this.SMapHandlers$.get(keyHandlerOrPathHandler);
        }
        if (this.isTypeHandler(keyHandlerOrPathHandler, "PathHandler")) {
            return this.SMapPathHandlers$.get(keyHandlerOrPathHandler);
        }
        return undefined;
    }

    //================================================================================================================================
    /*ready()*/
    //es un metodo especial que determina (devolviendo una promesa)
    //cuando el servicio esta listo para realizar consultas (lecturas 
    //y modificaciones) a firestore
    //cada consulta y modificacion ya esta enlacada a esta promesa asi 
    //que en el momento inicial que se realice alguna de estas acciones 
    //se ejecuta este metodo internamente
    public ready():Promise<void>{

        //determinar si ya esta listo el servicio
        //para que sea desactive el monitoreo
        if (this.isServiceReady == true) {

            //simula devolver una promesa pero en
            //realidad esta se ejecuta inmediatamente
            return Promise.resolve();
             
        } else {

            //determinar si se esta usando prubas locales 
            //para no detectar  la habilitacion de la persistencia

            if (this.isLocalFS == false) {
                //determina si la persistencia del 
                //servidor de Firestore esta habilitada
                return this.configCustomStateReady();
                // return this.U_afs.persistenceEnabled$.toPromise()
                // .then(() => {
                //     return this.configCustomStateReady();
                // })                
            } else {

                //si esta en modo de pruebas locales no se debe 
                //hacer comprobacion de persistencia habilitada
                
                this.U_afs.firestore.settings({
                    host: "localhost:9090",
                    ssl:false
                });

                return this.configCustomStateReady();
            }
        }
    }
    
    /*configCustomStateReady()*/
    //metodo intermedio para configura el estado de 
    //ready del servicio FS 
    private configCustomStateReady():Promise<void>{
        return new Promise<void>((resolve, reject)=>{

            //determinar si existen Handlers$ foraneos que monitorear
            //de lo contrario no crear ningun observable combinado
            if (this.f_keyHandlersOrPathhandlers$.length > 0 && this.f_services.length > 0) {

                //contenedor generico para combinar observables
                let obss:Observable<unknown>[]=[];

                for (let i = 0; i < this.f_services.length; i++) {

                    const f_mapH = this.f_services[i].SMapHandlers$;
                    const f_mapPH = this.f_services[i].SMapPathHandlers$;

                    for (let j = 0; j < this.f_keyHandlersOrPathhandlers$.length; j++) {
                    
                        let obs:Observable<unknown>;
                        
                        //analizar el tipo de handler y si existe en alguno de los mapas
                        if (
                            this.isTypeHandler(this.f_keyHandlersOrPathhandlers$[j], "Handler") &&
                            f_mapH.has(this.f_keyHandlersOrPathhandlers$[j])
                        ) {    
                            // se obtiene el handler foraneo correspondiente y se agrega al map 
                            //diccionario, tambien se obtiene el mergeAll de los obserbales que
                            //tenga internos dicho handler  
                            const h$ = f_mapH.get(this.f_keyHandlersOrPathhandlers$[j]);
                            this.SMapHandlers$.set(this.f_keyHandlersOrPathhandlers$[j], h$);
                            obs = h$.getObservableMergeAll(); 

                        }
                        if (
                            this.isTypeHandler(this.f_keyHandlersOrPathhandlers$[j], "PathHandler") &&
                            f_mapPH.has(this.f_keyHandlersOrPathhandlers$[j])
                        ) {
                            // se obtiene el pathHandler foraneo correspondiente y se agrega al map 
                            //diccionario, tambien se obtiene el mergeAll de los obserbales que
                            //tenga internos dicho pathHandler  
                            const ph$ = f_mapPH.get(this.f_keyHandlersOrPathhandlers$[j]);
                            this.SMapPathHandlers$.set(this.f_keyHandlersOrPathhandlers$[j], ph$);
                            obs = ph$.getObservableMergeAll(); 

                        }
                        
                        //almacenar en el contenedor el obs obtenido si existe:
                        if (obs && obs != null) {
                            obss.push(obs);    
                        }                                                
                    }                        
                    
                }

                //combinar y suscribirse para saber cuando se 
                //ejecutaron TODOS los observables de los handler$_ext
                // por primera vez (no se tiene en cuenta cuando se 
                //crearon cada handler$ ya que en ese momento se 
                //devuelve un empty() como observable, que no es 
                //detectado por este combineLastest()  )
                let f_subsCombine = combineLatest(obss)                    
                .subscribe({
                    next:(d)=>{
                        //se desuscribe al momento justo de detectar que 
                        //ya no hay mas handler$_ext que monitorear por primera vez
                        f_subsCombine.unsubscribe(); 

                        this.isServiceReady = true;                    
                        resolve();
                    },
                    error:(FSerr)=>{
                        reject(FSerr);
                    },
                });

            } else {
                //tiempo de espera a que el modulo de firestore este listo          
                const t = 10;
                setTimeout(() => {
                    //si no hay controls$ externos 
                    //no se puede hacer un monitoreo
                    this.isServiceReady = true;
                    resolve();                    
                }, t);                                  
            }
        });
    }

    //================================================================================================================================
    /*METODOS DE LECTURA GENERICA:*/
    //================================================================
    /*configHandlerForNewQuery$()*/
    //es un metodo especial que factoriza la mayor parte de la funcionalidad generica
    //de los metodos de lectura tipo CRUD para firestore, tomando como base la
    //configuracion preestablecidad en el handler$  recibido.
    //RECORDAR:
    //como las lecturas se ejecutan reactivamente con la ayuda de behaviors, toda
    //lectura que se realice se considera <<nueva lectura>> con lo cual se
    //le esta diciendo al behavior que la controla que se le asignará un nuevo filtro.
    //
    //este tipo de funcionalidad es administrada por el handler$
    //
    //Argumentos:
    //
    //keyHandler: la kye del handler a usar
    //
    //filter:
    //contiene la nueva configuracion correspondiente a la nueva lectura (entre sus propiedades
    //esta el tipo de paginacion, el limite, valQuerys, docInicial, entre otras)

    protected configHandlerForNewQuery$(
        keyHandler:string,
        filter:Ifs_FilterModel,
    ):void{

        //determinar si ya esta listo para ejecutar consultas
        this.ready()
        .then(()=>{

            //seleccionar el handler$ a manipular
            let handler$ = this.SMapHandlers$.get(keyHandler) as Fs_MServiceHandler$<TModel, Ifs_FilterModel>;

            //cast para usar la interfaz dedicada para Firestore
            const fs_filter = <Ifs_Filter>filter;

            //configurar propiedades que pueden tener valores predefinidos
            fs_filter.pageNum = (fs_filter.pageNum) ? fs_filter.pageNum: 0;
            fs_filter.limit = (fs_filter.limit) ? fs_filter.limit: this.defaultPageLimit;
            fs_filter.startDoc = (fs_filter.startDoc) ? fs_filter.startDoc : null;
            fs_filter.path_EmbBase = (fs_filter.path_EmbBase) ? fs_filter.path_EmbBase : null;

            //cast obligado para usar la metadata 
            const col_Meta = <IMetaColeccion><unknown>this.Model_Meta;
            
            //pathCollection:
            //la configuracion del pathCollection se establece dependiendo si es: 
            //coleccion o subcoleccion o subcoleccion pero con consulta collectionGroup
            //Si es coleccion normal:
            //implicitamente se entiende que path_EmbBase es null y no lo va
            // a tomar en cuenta.
            //Si es subcoleccion:
            //determinar cual de las 2 opciones de query se requiere si la
            //pathCollection personalizado (tomando en cuenta path_EmbBase que es lo ideal  
            //y se DEBE RECIBIR path_EmbBase valido ) o a traves del pathCollection estandar de 
            //la subColeccion (cuando ya se tiene establecido la EXENCION para poder 
            //usar collectionGroup() (si no se tiene la EXENCION se dispara un error por parte 
            //de angularfire2)) 
            //
            //isCollectionGroup tambien depende de path_EmbBase          
            fs_filter.pathCollection = 
                (col_Meta.__isEmbSubcoleccion) ?
                this._Util.getPathCollection(fs_filter.path_EmbBase) :
                this._Util.getPathCollection();  

            fs_filter.isCollectionGroup = 
                (col_Meta.__isEmbSubcoleccion && (!fs_filter.path_EmbBase || fs_filter.path_EmbBase == null)) ? 
                true : false;     

            //configurar el handler con el nuevo filtro
            handler$.configHandler(fs_filter as Ifs_FilterModel);

            switch (fs_filter.typePaginate) {

                //si se requiere personalizar el inicio de 
                //cada lectura nueva, es necesario crear los case independientes
                case ETypePaginate.No:
                case ETypePaginate.Single:                           
                    //configuracion de lectura para tipo de paginacion: 
                    //No, Single
                    handler$.isMultiHandler = false;                        
                    break;

                case ETypePaginate.Accumulative:
                    //configuracion de lectura para tipo de paginacion: 
                    handler$.isMultiHandler = false;  
                    //asignar el limite acumulativo
                    handler$.accumulatedLimit = fs_filter.limit;
                    break;

                case ETypePaginate.Full:
                    //para la paginacion full si se usa multihandlers$
                    handler$.isMultiHandler = true;
                    break;

                default:
                    break;
            }

            //cargar la nueva consulta con eel nuevo filtro preconfigurado
            handler$.nextFilterBh(fs_filter as Ifs_FilterModel);

            return;

        })
        .catch((error)=>{
            throw error;            
        })
    }

    //================================================================================================================================
    /*configPathHandlerForNewQuery$()*/
    //metodo especial solo usado para cargar nueva
    //lectura con el unico query de buscar por _pathDoc
    //y devolver SOLO UN doc o null
    //
    //Argumentos
    //
    //keyPathHandler: la key del pathHAndler a usar
    //
    //_pathDoc:
    //en este metodo NO SE REQUIERE un pathColeccion ya que este metodo apunta a leer un documento
    //por medio de un _pathDoc en el cual explicitamente va incluido el pathColeccion (incluso puede
    //ir el path de una coleccion y de varias subcolecciones dependiendo de que tan profundo
    //este el doc), por lo tanto se pasa un _pathDoc con el formato:
    //"/NomColeccion/{id}/nomSubColeccion/{id}..../nomSubColeccion_N/{_id_N}"
    //(RECORDAR:siempre debe terminar el _pathDoc en un _id)
    //
    protected configPathHandlerForNewQuery$(
        keyPathHandler:string,
        _pathDoc: string
    ):void {
        //determinar si ya esta listo para ejecutar consultas
        this.ready()
        .then(()=>{

            //seleccionar el handler$ a manipular
            let pathHandler$ = this.SMapPathHandlers$.get(keyPathHandler) as Fs_MServicePathHandler$<TModel>;

            pathHandler$.isPopulateHandler = false;
            pathHandler$.configPathHandler(_pathDoc, [], ETypePaginatePopulate.No);
            pathHandler$.nextFilterBh(_pathDoc);

            return;
        })
        .catch((error)=>{
            throw error;            
        });
    }

    //================================================================
    /*getObsQueryForHandler():*/
    //configura y devuelve el observable encargado monitorear la ultima lectura
    //
    //Argumentos:
    //
    //handler$: el handler$ previamente seleccionado que contiene las propiedades
    //globales para administrar y construiri el observable
    //
    private getObsQueryForHandler(
        handler$:Fs_MServiceHandler$<TModel, Ifs_FilterModel>
    ): Observable<TModel[]> {

        //internamente se autogestiona para devolver el behavior actual
        const behavior = handler$.getBehavior();

        //el pipe y el switchMap cambiar el observable dinamicamente cada vez que se
        //requiera un nuevo filtro por medio de handler$.behaviors.next()
        const Obs = behavior
            .pipe(switchMap((BhFilter) => {

                //cast para usar la interfaz de Firestore
                const fs_BhFilter = <Ifs_Filter>BhFilter;

                //Determina si no existe filtro de Query para ignorar
                // la busqueda (puede darse cuando se requiere solo 
                //instanciar el observable al inicio )
                if (!fs_BhFilter || fs_BhFilter == null) {
                    if (this.isServiceReady == false) {
                        //devuelve un observable vacio
                        //empy() permite que los observables
                        //asociados ignoren el evento cuando
                        //se crea el handler$
                        return empty();                        
                    } else {
                        return of([]);
                    }
                }

                //idxPag almacena un indice dinamico de la pagina a la
                //que corresponde el observable (su uso es indispensable
                //para la paginacion full)
                let idxPag = handler$.currentPageNum;

                //================================================
                //configuracion inicial para la lectura de docs en OPCION COLECCION
                //debe ya ESTAR ASIGNADO el valor de la porpiedad _pathColeccion
                //antes de solicitar la consulta
                //el callback   (ref)=>{}   permite la creacion del cursor de consulta
                //e implementar el filtro.
                //QFiltro.query contiene la funcion donde se configura y se devuleve
                //la query para ser enviada a firestore

                try {
                    let afsColQuery = (!fs_BhFilter.isCollectionGroup) ?
                        this.U_afs.collection(fs_BhFilter.pathCollection, (ref) => fs_BhFilter.query(ref, BhFilter))
                        :
                        this.U_afs.collectionGroup(fs_BhFilter.pathCollection, (ref) => fs_BhFilter.query(ref, BhFilter));

                    return afsColQuery
                        .snapshotChanges()  //devuelve docs y metadata
                        .pipe(
                            map(actions => {
                                //================================================================
                                //aqui se manipulan los docs que se reciben de la coleccion despues
                                //de la consulta, siempre se recibe un array llamado   actions
                                //al cual se le ejecuta un  .map() (de la clase array) para procesar
                                //los docs uno a uno (este procesamiento por ahora es opcional solo
                                //lo realizo por que en la documentacion oficial lo colocan o por si
                                //en algun momento requiereo un procesamiento especifico de cada
                                //documento leido (como por ejemplo si se usa un _id automatico
                                //de firestore))
                                //
                                //IMPORTANTE: *COMPORTAMIENTO EXTRAÑO*
                                //por alguna razon cuando modifico el filtro del behavior (para una
                                //nueva consulta o cuando creo un nuevo behavior(en el caso de la
                                //paginacion full)), el observable se dispara entregando docs no
                                //solicitados (normalmente es el ultimo doc de la coleccion pero
                                //como es un comportamiento inesperado puede que entregue cualquier
                                //cosa) y luego si entrega los docs solicitados, es importante tener
                                // en cuenta lo anterior ya que el codigo que se ejecute aqui
                                //(normalmente la administracion de la paginacion) y el codigo que
                                //se ejecute en los metodos next() de los RFS, debe anticipar este
                                //comportamiento y no asumir que los docs que entrega inmediatamente
                                //son los solicitados y tiene que esperar hasta la ULTIMA ENTREGA
                                //la cual si son los docs solicitados.
                                let docsLeidos = actions.map(a => {
                                    let data = a.payload.doc.data() as TModel;
                                    //const _id = a.payload.doc.id; //se puede omitri si uso ids personalizados

                                    //================================================================
                                    //ejecutar la funcion preGetDoc para customizar los datos
                                    //de acuerdo a las necesidades, doc a doc
                                    data = this.hooksInsideService.preGetDoc(data);
                                    //================================================================
                                    return data;
                                    //return { _id, ...data };

                                });
                                //================================================================
                                //determina la forma en que se entregaran los datos de acuerdo
                                //a si se deben paginar y que tipo de paginacion (estandar o full)
                                switch (fs_BhFilter.typePaginate) {
                                    case ETypePaginate.No:
                                        //--falta---
                                        handler$.listDocs = docsLeidos;
                                        break;

                                    case ETypePaginate.Single:
                                        //administrar los snapshot
                                        handler$ = this.updateSnapShotsDocs(handler$, actions, handler$.currentPageNum);

                                        handler$.listDocs = docsLeidos;
                                        //------------------------[EN CONSTRUCCION]------------------------
                                        //falta si se quiere conservar los docs leidos
                                        //anteriormente pero no monitoriados por observables
                                        //docsLeidos = doc$.listDocs.concat(docsLeidos);
                                        //----------------------------------------------------------------

                                        break;

                                    case ETypePaginate.Accumulative:
                                        //-falta---
                                        handler$.listDocs = docsLeidos;
                                        break;

                                    case ETypePaginate.Full:
                                        //administrar los snapshots
                                        handler$ = this.updateSnapShotsDocs(handler$, actions, idxPag);

                                        //reconstruir el contenedor listDocs del manejador
                                        handler$ = this.reBuildListDocsByPaginatedFull(handler$, fs_BhFilter, docsLeidos, idxPag);

                                        //administrar exceso de memoria:
                                        handler$ = this.reduceMemoryByPaginated(handler$, fs_BhFilter);

                                        docsLeidos = handler$.listDocs;
                                        break;

                                    default:
                                        break;
                                }
                                //================================================================
                                return docsLeidos;
                            })
                        );
                } catch (error) {
                    console.log(error);
                }

                //================================================================
            }));

        return Obs;
    }

    //================================================================
    /*getObservableQueryDocPathId*/
    //configura y devuelve el observable encargado monitorear la ultima
    //lectura este metodo es de acceso rapido para consultar SOLO UN DOCUMENTO
    //por medio de su _id
    //
    //Argumentos:
    //
    //handler$: el handler$ previamente seleccionado que contiene las propiedades
    //globales para administrar y construiri el observable
    private getObsQueryPathHandler(
        handler$:Fs_MServicePathHandler$<TModel>
    ): Observable<TModel | TModel[]> {

        // internamente se autogestiona para devolver el behavior actual
        let behavior = handler$.getBehavior(); 

        const Obs = behavior 
        .pipe(
            switchMap((pathDoc)=>{
                if (!pathDoc || pathDoc==null) {
                    if (this.isServiceReady == false) {
                        //devuelve un observable vacio
                        //empy() permite que los observables
                        //asociados ignoren el evento cuando
                        //se crea el handler$
                        return empty();                        
                    }
                    if (handler$.isPopulateHandler == false){
                        return of(null);
                    }else{
                        return of([]);
                    }
                }
                //a diferencia de getObservableQueryDoc() aqui la consulta es mas sencilla
                //no se requiere configuracion de query externa, la consulta se hace a base
                //de documento y no de coleccion y no se requiere obtener metadata especial
                //de firestore como snapShotDocument (a no ser que se requiera el _id automatico 
                //de firestore o requiera un documento snapShot)
                const doc_afs = <AngularFirestoreDocument<TModel>>this.U_afs.doc<TModel>(pathDoc);
                let cursor_afs_Obs = doc_afs.valueChanges() as Observable<TModel | TModel[]>;
                
                //determinar si se usa como populate
                if (handler$.isPopulateHandler == false) {
                    
                    cursor_afs_Obs = cursor_afs_Obs
                    .pipe(map(doc => {
                        return this.hooksInsideService.preGetDoc(doc as TModel);
                    }));

                    return cursor_afs_Obs;
                }else{
                    //================================================
                    //acumulará dinamicamente el idx del pathDoc que 
                    //se esta rastreando, su valor será asignado al 
                    //momento de obtener el doc (o null si no 
                    //encuentra el doc)                    
                    let idxPopulate: number = handler$.idxBhPathPopulate;

                    cursor_afs_Obs = cursor_afs_Obs
                    .pipe(map(doc => {


                        doc = this.hooksInsideService.preGetDoc(doc as TModel);
                        handler$.listPopulateDocs[idxPopulate] = doc;  
                        
                        //determina si se leyo un null para cerrar ese handler$ ya 
                        //que indica que el doc al que hace referencia el _pathDoc 
                        //ya fue eliminado
                        if (handler$.listPopulateDocs[idxPopulate] == null) {
                            handler$ = this.reducememoryByPopulate(handler$, idxPopulate);                                    
                        }

                        let docsRes = this._Util.deleteDocsNullForArray(handler$.listPopulateDocs);
                        return docsRes

                    }));

                    //actualizar el idxBhPathPopulate para un nuevo populate
                    handler$.idxBhPathPopulate++;

                    return cursor_afs_Obs;
                }
                //en caso de requerir metadata:
                // return doc_afs.snapshotChanges().pipe(map(actions=>{
                //     const doc = actions.payload.data() as TModelo
                //     //aqui.... procesar metadata.....
                //     //determinar si es un poblar:
                //     if (!pathDoc$.opcPopulate) {
                //         return doc as TModelo;                    
                //     }
                //     pathDoc$.opcPopulate.docPopulateList[idxObs] = doc as TModelo;
                //     return pathDoc$.opcPopulate.docPopulateList;
                // }));  
            })
        );

        return Obs;
    }

    //================================================================================================================================
    /*paginate$()*/
    //este metodo determina el tipo de paginacion y ejecuta una
    //consulta especial con el filtro modificado solo para paginacion
    //
    //Argumento:
    //
    //keyHandler:el key para seleccionar el handler$ a usar
    //
    //direccionPaginacion:
    //un string con 2 opciones "previo" | "siguiente", algunos tipos de paginacion solo soportan "siguiente"
    public paginate$(
        keyHandler:string,
        pageDirection: "previousPage" | "nextPage"
    ):void{
        //determinar si ya esta listo para ejecutar consultas
        this.ready()
        .then(()=>{

            //seleccionar handler a manipular:
            let handler$ = this.SMapHandlers$.get(keyHandler) as Fs_MServiceHandler$<TModel, Ifs_FilterModel>;

            //para paginar basta con tener el filtro del
            //ultimo behavior activo, 
            let BhFilter = handler$.getBhFilter();

            //clonar superficialmente el filtro
            let fs_BhFilter = <Ifs_Filter> Object.assign({}, BhFilter);

            switch (fs_BhFilter.typePaginate) {
                case ETypePaginate.No:
                    handler$.isMultiHandler = false;
                    //NO SE PAGINA
                    break;

                case ETypePaginate.Single:
                        //la paginacion reactiva Simple tiene la opcion de tener
                        //pagina siguiente y anterior y en cada opcion solo es necesario
                        //pasar el filtro con la configuracion para paginar por medio del
                        //metodo next() y actualizar el numero de la pagia actual
                        if (pageDirection == "nextPage" &&
                            handler$.listDocs.length == fs_BhFilter.limit) {

                            handler$.isMultiHandler = false;
                            //asigna el ultimo snapshotDocument para paginar apartir de ese doc
                            fs_BhFilter.startDoc = handler$.snapshotStartDocs[handler$.currentPageNum + 1];
                            handler$.nextFilterBh(fs_BhFilter as Ifs_FilterModel);
                            handler$.currentPageNum++;
                        }
                        if (pageDirection == "previousPage" &&
                            handler$.listDocs.length > 0 && handler$.currentPageNum > 0) {

                            handler$.isMultiHandler = false;
                            //asigna el ultimo snapshotDocument para paginar apartir de ese doc
                            fs_BhFilter.startDoc = handler$.snapshotStartDocs[handler$.currentPageNum - 1];
                            handler$.nextFilterBh(fs_BhFilter as Ifs_FilterModel);
                            handler$.currentPageNum--;
                        }
                        
                    break;

                case ETypePaginate.Accumulative:
                        //la paginacion reactiva Acumulativa SOLO  tiene la opcion de tener
                        //paginar siguiente y solo es necesario pasar el filtro con la
                        //configuracion para paginar por medio del metodo next() y actualizar
                        // el numero de la pagina actual
                        //Tambien para poder paginar siguiente es necesario que la cantidad
                        //de docs almacenados en doc$.listDocs sea igual doc$.limiteAcumulado
                        //ya que si es inferior se deduce que no es necesario seguir
                        //solicitando mas docs
                        if (pageDirection == "nextPage" &&
                            handler$.listDocs.length == handler$.accumulatedLimit) { //RECORDAR:es handler$.accumulatedLimit y no QFiltro.limit

                            //actualizar el limite acumulado
                            handler$.isMultiHandler = false;
                            //actualiza el limite acumulado y lo asigna al nuevo filtro
                            handler$.accumulatedLimit += fs_BhFilter.limit;
                            fs_BhFilter.limit = handler$.accumulatedLimit;

                            handler$.nextFilterBh(fs_BhFilter as Ifs_FilterModel);
                            handler$.currentPageNum++; //llevar este contador de pagina para este caso es opcional
                        }
                    break;

                case ETypePaginate.Full:
                        //la paginacion reactiva full solo puede ser pagina siguiente
                        if (pageDirection == "nextPage") {

                            //se determina el limite del lote de documento que deben leerse antes
                            //de autorizar la creacion de un nuevo behavior y una suscripcion
                            //multiplicando la paginas actuales por el limite por pagina
                            //para autorizar es necesario que sea igual el limiteLote
                            //con la cantidad real de documentos leidos hasta el momento
                            let limiteLote = (handler$.currentPageNum + 1) * fs_BhFilter.limit;
                            if (handler$.listDocs.length == limiteLote) {

                                handler$.isMultiHandler = true;
                                fs_BhFilter.startDoc = handler$.snapshotStartDocs[handler$.currentPageNum + 1];
                                handler$.currentPageNum++;
                                
                                //crea el nuevo handler en el contenedor
                                handler$.createBehavior(fs_BhFilter as Ifs_FilterModel);
                                handler$.setObservable(this.getObsQueryForHandler(handler$));
                                handler$.addSubscribe(null, null);

                            }
                        }
                    break;

                default:
                    break;
            }
            return
        })
        .catch((error)=>{
            throw error;            
        });
    }

    //================================================================================================================================
    /*populate$()*/
    //permite el poblar documentos refernciado en campos con 
    //prefijo  fk_  que almacenan rutas _pathDoc de este modelo
    //este metodo se usa como paso intermedio en caso de desear
    //personalizarlo exclusivamente para este servicio
    //
    //Parametros:
    //
    //keyPathHandler:
    //el key que selecciona el handler$a usar
    //
    //fk_pathDocs:
    //contiene el o los strings de _pathDoc que hacen referencia a otros documentos
    //si es es un slo string indica que el campo   fk_  esta relacionado con otra 
    //coleccion en modo 1a1 o 0a1, si es un array indica que el campo fk_ esta 
    //relacionado con otra coleccion como  0aMuchos o 1aMuchos 
    //
    //typePaginatePopulate:
    //por medio de la enum  ETypePaginatePopulate  determina
    //el tipo de paginacion a usar para poblar el pathhandler$
    //
    //limitPopulate:
    //si se desea un limite personalizado para la paginacion de poblar
    public populate$(
        keyPathHandler:string,
        fk_pathDocs: string | string[],
        typePaginatePopulate?:ETypePaginatePopulate,       
        limitPopulate:number = this.defaultLimitPopulate,
    ):void{

        //determinar si ya esta listo para ejecutar consultas
        this.ready()
        .then(()=>{

            //cast
            fk_pathDocs = (Array.isArray(fk_pathDocs)) ? fk_pathDocs : [fk_pathDocs];

            //configurar el tipo de paginacion deseada
            typePaginatePopulate = (typePaginatePopulate)? typePaginatePopulate : ETypePaginatePopulate.Single;

            //seleccionar el handler a manipular
            let pathHandler$ = this.SMapPathHandlers$.get(keyPathHandler) as Fs_MServicePathHandler$<TModel>;

            pathHandler$.configPathHandler(null, fk_pathDocs,typePaginatePopulate,limitPopulate);            

            let idxIni = 0;
            let size = (pathHandler$._pathPopulateDocs.length >= pathHandler$.limitPopulate) ?
                        pathHandler$.limitPopulate : pathHandler$._pathPopulateDocs.length;
            let populateFilter = pathHandler$._pathPopulateDocs.slice(idxIni, size);

            //crear todos los NUEVOS populateHandlers$ a usar (sean o no acumulados)
            for (let i = 0; i < populateFilter.length; i++) {
                
                pathHandler$.createBehavior(populateFilter[i]);
                pathHandler$.setObservable(this.getObsQueryPathHandler(pathHandler$));
                
                //se deben asignar los RFS y idSubscribe previamente 
                //configurados (eso lo hace el metodo internamente)
                pathHandler$.addSubscribe(null, null); 
            }
            return

        })
        .catch((error)=>{
            throw error;            
        });
    }

    /*pagitanePopulatehandler$()*/
    //es para paginacion basica de populate, por ahora solo redirecciona
    //al metodo principal pagitanePopulatehandler$(), aqui se uede implementar
    //logica personalizada para cada paginacion, si se desea
    //
    //Parametros:
    //pathhandler$:
    //el key para seleccionar el handler$ a usar
    //
    //pageDirection
    // las 2 opciones de direccion de paginar (no en todos los 
    //typePaginate se pueden usar)
    public pagitanePopulate$(
        keyPathHandler:string,
        pageDirection: "previousPage" | "nextPage"
    ):void{
        //determinar si ya esta listo para ejecutar consultas
        this.ready()
        .then(()=>{

            //seleccionar el handler a manipular
            let pathHandler$ = this.SMapPathHandlers$.get(keyPathHandler) as Fs_MServicePathHandler$<TModel>;

            //el tamaño total de los _pathDocs a poblar
            const size_pathPopulateDocs = pathHandler$._pathPopulateDocs.length;

            //contendrá el parcial de los _pathDocs a filtrar y paginar
            let populateFilter:string[];   

            switch (pathHandler$.typePaginatePopulate) {

                case ETypePaginatePopulate.No:
                    break;

                case ETypePaginatePopulate.Single:

                    //pagina anterior
                    if (pageDirection == "previousPage" &&
                        size_pathPopulateDocs > 0 &&
                        pathHandler$.currentPageNum > 0 //el control de paginas se realiza con logica desde 0
                    ) {

                        //garantizar que no tenga desborde de elementos almacenados en el 
                        //contenedor populateHandlers$, esto puede darse si por algun motivo 
                        //durante la paginacion se cambio de una paginacion Full a una sencilla
                        //si se llega a dar este caso es necesario cerrar el exceso de elementos
                        if (pathHandler$.limitPopulate < pathHandler$.getSizeContainerHandlers$()) {
                            pathHandler$.closeContainerHandlers$(pathHandler$.limitPopulate);
                        }

                        //extrae solo los _pathDocs que se rastrearan en esta pagina
                        populateFilter = this.getPartial_pathDocsForPaginate(pathHandler$, pageDirection);

                        //comprobar que el contenedor containerHandlers$ tenga suficientes handlers 
                        //para realizar la paginacion, de lo contrario es necesario crear los que 
                        //hagan falta
                        if (populateFilter.length > pathHandler$.getSizeContainerHandlers$()) {

                            //diff indica los faltantes
                            const diff = populateFilter.length - pathHandler$.getSizeContainerHandlers$();
                            for (let i = 0; i < diff; i++) {
                                pathHandler$.createBehavior(null);
                                pathHandler$.setObservable(this.getObsQueryPathHandler(pathHandler$));
                                pathHandler$.addSubscribe(null, null);
                            }
                        }

                        //por ser paginacion Single se debe 
                        //reiniciar el contenedor de salida y elidx
                        pathHandler$.idxBhPathPopulate = 0;
                        pathHandler$.listPopulateDocs = [];

                        //ejecutar el filtrado de paginacion
                        pathHandler$.nextFilterBh(populateFilter);

                        pathHandler$.currentPageNum--;

                    }
                    //pagina siguiente
                    if (pageDirection == "nextPage" &&
                        size_pathPopulateDocs > (pathHandler$.limitPopulate * pathHandler$.currentPageNum)
                    ) {

                        //garantizar que no tenga desborde de elementos almacenados en el 
                        //contenedor populateHandlers$, esto puede darse si por algun motivo 
                        //durante la paginacion se cambio de una paginacion Full a una sencilla
                        //si se llega a dar este caso es necesario cerrar el exceso de elementos
                        if (pathHandler$.limitPopulate < pathHandler$.getSizeContainerHandlers$()) {
                            pathHandler$.closeContainerHandlers$(pathHandler$.limitPopulate);
                        }

                        //extrae solo los _pathDocs que se rastrearan en esta pagina
                        populateFilter = this.getPartial_pathDocsForPaginate(pathHandler$, pageDirection);

                        //comprobar que el containerHandlers$ NO tenga exceso de handlers 
                        //para realizar la paginacion, de lo contrario es necesario cerrar
                        if (populateFilter.length < pathHandler$.getSizeContainerHandlers$()) {
                            pathHandler$.closeContainerHandlers$(populateFilter.length);
                        }

                        //por ser paginacion Single se debe 
                        //reiniciar el contenedor de salida 
                        //y el idx
                        pathHandler$.idxBhPathPopulate = 0;
                        pathHandler$.listPopulateDocs = [];

                        //ejecutar el filtrado de paginacion
                        pathHandler$.nextFilterBh(populateFilter);;

                        pathHandler$.currentPageNum++;
                    }
                    break;

                case ETypePaginatePopulate.AccumulativePasive:
                        //pagina siguiente
                        if (pageDirection == "nextPage" &&
                        size_pathPopulateDocs > (pathHandler$.limitPopulate * pathHandler$.currentPageNum)
                        ) {

                        //garantizar que no tenga desborde de elementos almacenados en el 
                        //contenedor populateHandlers$, esto puede darse si por algun motivo 
                        //durante la paginacion se cambio de una paginacion Full a una sencilla
                        //si se llega a dar este caso es necesario cerrar el exceso de elementos
                        if (pathHandler$.limitPopulate < pathHandler$.getSizeContainerHandlers$()) {
                            pathHandler$.closeContainerHandlers$(pathHandler$.limitPopulate);
                        }

                        //extrae solo los _pathDocs que se rastrearan en esta pagina
                        populateFilter = this.getPartial_pathDocsForPaginate(pathHandler$, pageDirection);

                        //ejecutar el filtrado de paginacion
                        pathHandler$.nextFilterBh(populateFilter);;

                        pathHandler$.currentPageNum++;
                    }
                    break;

                case ETypePaginatePopulate.Full:

                    if (pageDirection == "nextPage" &&
                        size_pathPopulateDocs > (pathHandler$.limitPopulate * pathHandler$.currentPageNum)
                    ) {

                        //extrae solo los _pathDocs que se rastrearan en esta pagina
                        populateFilter = this.getPartial_pathDocsForPaginate(pathHandler$, pageDirection);

                        //crear todos los NUEVOS populateHandlers$ a usar 
                        for (let i = 0; i < populateFilter.length; i++) {
                            
                            //de una vez los carga con el filtro
                            pathHandler$.createBehavior(populateFilter[i]);
                            pathHandler$.setObservable(this.getObsQueryPathHandler(pathHandler$));
                            pathHandler$.addSubscribe(null, null);
                        }

                        pathHandler$.currentPageNum++;
                    }

                    break;

                default:
                    break;
            }

            return

        })
        .catch((error)=>{
            throw error;            
        });
    }

    //================================================================================================================================
    /*getId$()*/
    //refactorizacion de este metodo para realizar consultas de 
    //tipo collection (no Document)para cualquier model
    //
    //Parametros:
    //
    protected getId$(
        keyHandler:string,
        _id:string,
        path_EmbBase:string = null,
    ):void{

        //configurar tipo de paginacion deseada:
        const typePaginate =  ETypePaginate.No;

        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, BhFilter:unknown) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            //================================================================
            //Query Condiciones:
            cursorQueryRef = cursorQueryRef.where("_id", "==", _id);            
            //================================================================
            //no se requiere paginar            
            return cursorQueryRef;
        };   

        const VQuery = <Ifs_Filter>{
            query,
            typePaginate,
            path_EmbBase,
            limit:1,
            pageNum:0,
            startDoc:null
        }

        this.configHandlerForNewQuery$(keyHandler, VQuery as Ifs_FilterModel);
        
        return ;
    }

    //================================================================================================================================
    /*getBy_pathDoc$()*/
    //permite consultar un solo doc siempre y cuando se tenga el path_id
    public getBy_pathDoc$(
        keyPathHandler:string,       
        _pathDoc: string | null
    ):void{
        this.configPathHandlerForNewQuery$(keyPathHandler,  _pathDoc);
        return
    }
    //================================================================================================================================
    /*create()*/
    //refactoriza el metodo create de todos los servicios para firestore
    //
    //Argumentos:
    //
    //newDoc : el nuevo docuemnto a crear
    //
    //path_EmbBase: si es una subcoleccion
    protected create(
        newDoc: TModel, 
        path_EmbBase: string 
    ): Promise<void> {

        newDoc = this.hooksInsideService.preModDoc(newDoc, true, false, path_EmbBase); 

        const _id = newDoc["_id"]; //esto para ids personalizados
        const path_afs =this._Util.getPathCollection(path_EmbBase);
        const refColletion = this.U_afs.collection<TModel>(path_afs);

        //encadeno la modificacion de la coleccion a la promesa de ready()
        return this.ready()
        // .then(() => {
        //     //espera por modificaciones pendientes
        //     return refColletion.ref.firestore.waitForPendingWrites();
        // }) 
        .then(() => {    
            //la opcion de { merge: true } le indica al metodo set que 
            //cree el documento pero si este ya fue creado, actualice solo 
            //los campos que han tenido modificacion
            return refColletion.doc(_id).set(newDoc, { merge: true });

        })        
        .then(() => {
            //ejecutar el postMod (si existe)
            this.hooksInsideService.postModDoc(newDoc, true);
            return;
        });
    }

    /*update()*/
    //refactoriza el metodo update de todos los servicios para firestore
    //
    //Argumentos:
    //
    //updatedDoc : el documento a actualizar
    //
    //isStrongUpdate : si se desea sobre escribir los campos 
    //Map completamente en la coleccion, predefinido esta 
    //false ya que esta si no se usa con precaucion puede 
    //eliminar toda la informacion de los campos map por 
    //error 
    //
    //path_EmbBase: si es una subcoleccion
    protected update(
        updatedDoc: TModel,
        isStrongUpdate = false,
        path_EmbBase: string  
    ): Promise<void> {

        updatedDoc = this.hooksInsideService.preModDoc(updatedDoc, false, isStrongUpdate, path_EmbBase);

        const _id = updatedDoc["_id"]; //esto para ids personalizados
        const refColletion = this.U_afs.collection<TModel>(this._Util.getPathCollection(path_EmbBase));

        //encadeno la modificacion de la coleccion a la promesa de ready()
        return this.ready()
        // .then(() => {
        //     //espera por modificaciones pendientes
        //     return refColletion.ref.firestore.waitForPendingWrites();
        // })        
        .then(()=>{
            return refColletion.doc(_id).update(updatedDoc)
        })
        .then(() => {
            //ejecutar el postMod (si existe)
            this.hooksInsideService.postModDoc(updatedDoc, false);
            return;
        });
    }

    /*delete()*/
    //refactoriza el metodo delete de todos los servicios para firestore
    //
    //Argumentos:
    //
    //_id el _id del documento a eliminar
    //
    //path_EmbBase: si es una subcoleccion
    protected delete(
        _id: string, 
        path_EmbBase: string 
    ): Promise<void> {

        _id = this.hooksInsideService.preDeleteDoc(_id);

        const refColletion = this.U_afs.collection<TModel>(this._Util.getPathCollection(path_EmbBase));

        //encadeno la modificacion de la coleccion a la promesa de ready()
        return this.ready()
        // .then(() => {
        //     //espera por modificaciones pendientes
        //     return refColletion.ref.firestore.waitForPendingWrites();
        // })
        .then(()=>{
            return refColletion.doc(_id).delete()
        })
        .then(() => {
            //ejecutar el postDelete (si existe)
            this.hooksInsideService.postDeleteDoc(_id);
            return;
        });
    }
    
    //================================================================
    /*metodos de desuscripcion de observables*/
    //para ahorrar memoria, se usa tipado unknown para recibir cualquier
    //handler$ sea externo o interno al service

    /*closeHandlers$()*/
    //
    //Parametros:
    //keyHandlers: las key de los handlers a desuscribir, cerrar y eliminar
    public closeHandlersOrPathHandlers$(
        keyHandlersOrkeyPathHandlers:string | string[]
    ):void{

        //determinar si no existe keys que cerrar
        if (!keyHandlersOrkeyPathHandlers || (Array.isArray(keyHandlersOrkeyPathHandlers) && keyHandlersOrkeyPathHandlers.length == 0)) {
            return
        }

        //contenedores selectivos para los tipos de key
        let allKeysHandlers$:string[]=[];
        let allKeysPathHandlers$:string[]=[];

        for (let i = 0; i < keyHandlersOrkeyPathHandlers.length; i++) {
            if (this.isTypeHandler(keyHandlersOrkeyPathHandlers[i], "Handler")) {
                allKeysHandlers$.push(keyHandlersOrkeyPathHandlers[i]);
            }
            if (this.isTypeHandler(keyHandlersOrkeyPathHandlers[i], "PathHandler")) {
                allKeysPathHandlers$.push(keyHandlersOrkeyPathHandlers[i]);
            }
            
        }

        //desuscribe los handlers Seleccionados
        if(allKeysHandlers$.length > 0){
            for (let i = 0; i < allKeysHandlers$.length; i++) {                
                if (this.SMapHandlers$.has(allKeysHandlers$[i])) {
                    const handler$ = this.SMapHandlers$.get(allKeysHandlers$[i]);
                    handler$.closeAllHandlers$(handler$);
                    this.SMapHandlers$.delete(allKeysHandlers$[i]);
                }                
            }
        }

        if(allKeysPathHandlers$.length > 0){
            for (let i = 0; i < allKeysPathHandlers$.length; i++) {                
                if (this.SMapPathHandlers$.has(allKeysPathHandlers$[i])) {
                    const Pathhandler$ = this.SMapPathHandlers$.get(allKeysPathHandlers$[i]);
                    Pathhandler$.closeAllHandlers$(Pathhandler$);
                    this.SMapPathHandlers$.delete(allKeysPathHandlers$[i]);
                }                
            }
        }
   
        return;
    }

    /*ADVERTENCIA:*/
    //solo se debe usar en los casos donde se requiera desuscribirse a TODO
    //lo referente a este servicio, incluyendo los f_Controls$  y el g_handler$, 
    //si se desea conservar estos controls$ vitales para el funcionamiento del servicio
    //es mejor usar los metodos de desuscripcion detallados como:
    //   unsubscribeControls$(), unsubscribePathControls$() y demas... 
    public closeAllHandlersForModelService$(isCloseInternalHandler=false):void {

        //contenedor global para las keys
        let allKeysHandlersAndPathHandlers$:string[] = [];
        
        //contenedores utilitarios
        let kH:string[];
        let kPH:string[];

        if (isCloseInternalHandler == true) {
            //almacenar los handler usados internamente (como en Model_meta)
            kH = Array.from(this.SMapHandlers$.keys());
            kPH = Array.from(this.SMapPathHandlers$.keys());
            
        }else{
            //almacenar los handler usados internamente (como en Model_meta)
            kH = Array.from(this.SMapHandlers$.keys());
            kPH = Array.from(this.SMapPathHandlers$.keys());

            const col_meta = <IMetaColeccion><unknown>this.Model_Meta;
            const reg = new RegExp(col_meta.__nomColeccion);

            kH = kH.filter(item=>reg.test(item));
            kPH = kH.filter(item=>reg.test(item));           
            
            //dejar como no listo el servicio
            this.isServiceReady = false;
        }

        allKeysHandlersAndPathHandlers$ = allKeysHandlersAndPathHandlers$.concat(kH).concat(kPH);

        this.closeHandlersOrPathHandlers$(allKeysHandlersAndPathHandlers$);

    }

    //================================================================================================================================
    /*Utilitarios*/
    //================================================================
    /*addRFStoHandlerOrPathHandler$()*/
    //permite adicionar una funcion RFS (o mas llamandolo varias veces)
    //al handler$ y subscribirlas inmediatamente
    public addRFStoHandlerOrPathHandler$(
        keyHandlerOrPathHandler:string,
        newIdSubscription:string,
        RFS:IRunFunSuscribe<TModel[]>,
    ):void{
        
        //seleccionar el handler$
        if (this.isTypeHandler(keyHandlerOrPathHandler, "Handler")) {
            let handler$ = this.SMapHandlers$.get(keyHandlerOrPathHandler);
            handler$.addSubscribe(newIdSubscription, RFS);            
        }

        if (this.isTypeHandler(keyHandlerOrPathHandler, "PathHandler")) {
            let handler$ = this.SMapPathHandlers$.get(keyHandlerOrPathHandler);
            handler$.addSubscribe(newIdSubscription, RFS);
        }        

        return ;
    }

    //================================================================
    /*updateSnapShotsDocs()*/
    //actualiza el contenedor de snapShotDoc para saber cual es el 
    //nuevo documento inicial de lectura para paginacion
    //
    //Parametros:
    //handler$: el manejador con las propiedades de cada consulta, sus behaviors,
    // observables y subscripciones que tenga asignado
    //
    //actions: contenedor de objetos especiales de Firestore que contienen los 
    //snapshots de la lectura mas reciente de docs
    //
    //idxPag_Or_CurrentPage: dependiendo del tipo de paginacion que se este usando
    //este parametro contendrá el idxPage (necesario para la pagicion full) o el
    //handler$.currentPageNum (si es paginacionm semcilla) 
    private updateSnapShotsDocs(
        handler$:Fs_MServiceHandler$<TModel, Ifs_FilterModel>,
        actions:DocumentChangeAction<unknown>[],
        idxPag_Or_CurrentPage:number
    ):Fs_MServiceHandler$<TModel, Ifs_FilterModel>{
        //
        if (actions.length > 0) {
            //este es un documento especial entregado por firestore
            //que se debe usar para los metodos starAt() o starAfter
            //en las querys a enviar en firestore
            const lastAction = actions.length - 1
            const snapShotDoc = actions[lastAction].payload.doc           
            
            //se actualiza el contenedor de snapShotsDocs
            handler$.snapshotStartDocs[idxPag_Or_CurrentPage + 1] = snapShotDoc;
            
        }
        return handler$;
    }
    //================================================================
    /*reBuildListDocsByPaginatedFull()*/
    //handler$.listDocs, contiene una copia de TODOS los docs monitoriados
    //de TODOS los observables que se han creado para la paginacion full.
    //
    //se intenta dividir el handler$.listDocs en 2 arrays independientes
    //iniListDocsParcial ,  finListDocsParcial ; para que en el medio
    //sea concatenado los docs de la nueva pagina, (teniendo en cuenta
    //que la division no se hace cuando  handler$.listDocs esta vacio o cuando
    //se esta detectando la ultima pagina); esto se logra por medio del
    //idxPag que permite calcular el idx de particion.
    //
    //Parametros:
    //
    private reBuildListDocsByPaginatedFull(
        handler$:Fs_MServiceHandler$<TModel, Ifs_FilterModel>,
        fs_Bhfilter:Ifs_Filter,
        readDocs:TModel[],
        idxPag:number,
    ):Fs_MServiceHandler$<TModel, Ifs_FilterModel>{
        //iniciar separacion handler$.listDocs de en 2 arrays diferentes
        let iniIdxSeccion = idxPag * fs_Bhfilter.limit;
        let finIdxSeccion = (idxPag + 1) * fs_Bhfilter.limit;

        let iniListDocsParcial: TModel[] = [];
        let finListDocsParcial: TModel[] = [];

        if (handler$.listDocs.length >= iniIdxSeccion) {
            iniListDocsParcial = handler$.listDocs.slice(0, iniIdxSeccion);
        }
        if (handler$.listDocs.length >= finIdxSeccion) {
            finListDocsParcial = handler$.listDocs.slice(finIdxSeccion);
        }

        //se re-arma doc$.listDocs con los nuevos docs (o con las modificaciones)
        //recordando que este codigo se ejecuta ya se por que se realizó una nueva
        //consulta o por que el observable detecto alguna modificacion de algun doc
        const lsD = iniListDocsParcial.concat(readDocs).concat(finListDocsParcial);
        if (lsD.length > 0) {
            handler$.listDocs = this._Util.deleteDocsDuplicateForArray(lsD, "_id"); //-- solo para _id personalizados
        } else {
            handler$.listDocs = [];
        }        

        return handler$;
    }
    
    //================================================================
    /*getPartial_pathDocsForPaginate()*/
    //
    //Parametros:
    //
    private getPartial_pathDocsForPaginate(pathHandler$:Fs_MServicePathHandler$<TModel>, pageDirection: "previousPage" | "nextPage"):string[]{
        
        let idxIni:number;
        let sizePartial:number;
        const sizePathDocs = pathHandler$._pathPopulateDocs.length;

        //extrae solo los _pathDocs que se rastrearan en esta pagina
        if (pageDirection == "previousPage") {
            idxIni = pathHandler$.limitPopulate * (pathHandler$.currentPageNum - 1);
            sizePartial = pathHandler$.limitPopulate * pathHandler$.currentPageNum;            
        }
        
        if (pageDirection == "nextPage") {
            idxIni = pathHandler$.limitPopulate * (pathHandler$.currentPageNum + 1);
            sizePartial = (sizePathDocs >= (pathHandler$.limitPopulate * (pathHandler$.currentPageNum + 2))) ?
                    pathHandler$.limitPopulate * (pathHandler$.currentPageNum + 2) :
                    sizePathDocs;            
        }

        return  pathHandler$._pathPopulateDocs.slice(idxIni, sizePartial);
    }
    
    //================================================================
    /*reduceMemoryByPaginated()*/
    //administracion de memoria de observables para la paginacion reactiva full
    //desuscribe los observables que no estan siendo utilizados, ya que cada vez
    //que exista una modificacion en algun documento (especificamente eliminacion)
    //puede darse el caso que se hallan eliminado muchos docs lo cual dejaria 1 o
    //mas observables monitoriando  vacios []  , para evitar esto este fragmento
    //de codigo analiza si existen observables que esten rastreando   vacios[]
    //y los desuscribe y elimina
    //
    //Parametros:
    //handler$: el manejador con las propiedades de cada consulta, sus behaviors,
    // observables y subscripciones que tenga asignado
    private reduceMemoryByPaginated(
        handler$:Fs_MServiceHandler$<TModel, Ifs_FilterModel>,
        BhFilter:Ifs_Filter
    ):Fs_MServiceHandler$<TModel, Ifs_FilterModel>{

        //la cantidad minima de de subscripciones que 
        //deben permanecer vivas aunque que rastreen vacios
        //si se desea ser estricto con no dejar monitoreos 
        //vacios se debe asignar 0, sin embargo 1 es lo adecuado
        const minSubsKeepAlive = 1;

        const limitDocs = BhFilter.limit;
        const totalDocs = handler$.listDocs.length; 

        //el numero real de paginas de acuerdo a los 
        //docs que se esten rastreando
        const realPageNum = Math.ceil(totalDocs / limitDocs);
        //numero de paginas virtuales que la aplicacion 
        //asume que se han leido, 
        //Importante:tiene logica 1
        const virtualPageNum = handler$.currentPageNum + 1;

        //se determina las paginas en exceso, se le descuenta
        //las subscribciones que se quiere que sigan vivas 
        //aunque se esten rastreando vacios 
        const excessPageNum = virtualPageNum - realPageNum - minSubsKeepAlive;

        if (excessPageNum > 0 ) {

            //se usa una espera corta para entregar los docs 
            //leidos antes de realizar el cierre
            const t = 5; //5ms
            setTimeout(() => {
                //las subscriciones que deben quedar vivas
                //recordar: se eliminan las ultimas que se hallan agregado
                const keepAlive = virtualPageNum - excessPageNum;
                handler$.closeContainerHandlers$(keepAlive);                
            }, t);

        }

        return handler$;
    }

    /*reducememoryByPopulate()*/
    //
    //Parametros:
    //pathHandler$: el handler a reducirole memoria 
    private reducememoryByPopulate(pathHandler$:Fs_MServicePathHandler$<TModel>, idxPopulate:number):Fs_MServicePathHandler$<TModel>{
        //se usa una espera corta para entregar los docs 
        //leidos antes de realizar el cierre
        const t = 5; //5ms
        setTimeout(() => {
            pathHandler$.closeContainerHandlerByIdxCH(idxPopulate);                
        }, t);

        return pathHandler$;
    }
    
    //================================================================================================================================
    /*isTypeHandler()*/
    //determina si la keyHandler recibida pertenece al mismo tipo testeado
    //Parametros:
    //keyTest: key a testear
    //typeTest: tipo de handler esperado
    private isTypeHandler(keyTest:string, typeTest:"Handler"|"PathHandler"):boolean{
        const reg = new RegExp(typeTest);
        return reg.test(keyTest);
    }

    //================================================================================================================================
    /*createDocsTestByTime()*/
    //usado para crear docs de testeo en masa separados por un tiempo t
    //Parametros:
    //
    //docsTest : los documentos test a crear
    //
    protected createDocsTestByTime(docsTest:TModel | TModel[], path_EmbBase?:string):void{
        
        let dT = (Array.isArray(docsTest)) ? docsTest : [docsTest];

        const ti = 1000;
        let idx = 0;
        const interval = setInterval(()=>{           
            if (idx == (dT.length - 1)) {
                return clearInterval(interval);                
            }   

            this.create(dT[idx], path_EmbBase)
            .then(() => {
                console.log(`Doc ${dT[idx]["_pathDoc"]} creado`);
            })
            .catch((error)=>{ console.log(error)});  
            
            idx++;

        }, ti);        
    }
    
}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████



