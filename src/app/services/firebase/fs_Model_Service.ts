
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument, AngularFirestoreCollectionGroup } from '@angular/fire/firestore';
import { Observable, observable, Subject, BehaviorSubject, from, fromEvent, of, Subscription, interval, timer, combineLatest, empty } from 'rxjs';
import { map, switchMap, mergeAll, concatAll, concatMap, mergeMap, mapTo, toArray, concat, skip } from 'rxjs/operators';

//permite crear los _ids personalizados
import { v4 } from "uuid";
import { IMetaCampo, IMetaColeccion } from './meta_Util';

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IQValue*/
//interfaz que permite establecer propiedades que almacenan valores para la Query
//como valores absolutos, rangos, comparaciones y demas.
//(para los campos del modelo sobre los cuales se ejecuten algun tipo de consulta)
//
//a los campos se les puede asignar propiedades personalizadas sin embargo existen
// algunas propiedades comunes como:
// val-> contiene el valor absoluto para la busqueda
// ini-> contiene el valor inicial para la busqueda (ideal para la inicial de los campos string)
// min-> valor minimo (ideal para number)
// max-> valor maximo (ideal para number)
export interface IQValue{
    val?: any;
    ini?: string;
    min?: number;
    max?: number;

    _orden:"asc"|"desc";
    //...mas propiedades en comun....
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
    No,

    //Paginacion basica que solo requiere de 1 observable del control$
    //permite direccion de paginacion  "previo" || "siguiente", por ahora
    //no deja copia de los docs leidos en paginas anteriores o siguientes
    //(solo se monitorea la actual)
    Single,

    //Paginacion que acumula el limite de lectura del query y asi devolver
    //en cada paginacion la cantidad de docs previamente leidos + la nueva pagina
    //Solo permite direccion de paginacion "siguiente"
    //IMPORTANTE: este tipo de paginacion es el que consume mas lecturas en firestore
    Accumulative,

    //Paginacion especial que crea un behavior, observable  y suscription
    //por cada pagina que se solicite, permite monitorear TODOS los documentos
    //previamente leidos y se autogestiona para detectar duplicados y ahorro
    //de momoria cuando los observables estan monitoreando vacios[].
    //Esta paginacion solo permite la direccion de paginacion "siguiente"
    Full
}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*ETypePaginatePopulate*/
//
export enum ETypePaginatePopulate {
    No,
    Single,
    Accumulative
}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IQFilter*/
//contiene las propiedades necesarias para construir una query estandar
//con sus filtros

export interface IQFilter {

    //OBLIGATORIA, contiene la funcion query que se ejecutara para
    //solicitar los docs a firestore de acuerdo a la construccion
    //interna de dicha funcion
    query:(ref:firebase.firestore.CollectionReference | firebase.firestore.Query)=>firebase.firestore.CollectionReference | firebase.firestore.Query;

    //contiene un valor enum de EtipoPaginar que indica que tipo
    //de paginacion se requiere
    typePaginate: ETypePaginate;

    //limite maximo de documentos que se deben leer
    //(especialmente en paginacion)
    limit:number;

    //aunque se define como any que en realidad es un snapshotDocument
    //de firestore que es necesario para determinar apartir
    //de que documento se empieza la lectura (necesario para ambos
    //tipos de paginacion (estandar o full))
    startDoc:any;

    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    v_PreGet:unknown;

}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IControl$*/
//permite la declaracion de objetos control$ que continene todo lo
//necesario para consultar y monitorear cambios
//Tipado:
//TModel:
//interfaz de la clase modelo
//TIModel_IQValue:
//IMPORTANTE: recibe un tipado con sintaxis: TIModel<IQValue_Model>
//Recordar: IQValue_Model  tipado especial enfocado a los valores
//necesarios para construir la query
export interface IControl$<TModel> {
    //objetos para rastreo y monitoreo de las querys:
    behaviors: BehaviorSubject<IQFilter>[];
    observables: Observable<TModel[]>[];
    //un solo observable puede tener muchas suscripciones
    //por lo tanto esta propiedad es un array bidimensional
    subscriptions: Subscription[][];
    //observable resultante de la union del 
    //array de observables por medio de MergeAll()
    //se usa principalmente para la paginacion full
    //en casos en donde se desee agrupar (merge) todos
    //los observables correspondientes al array
    obsMergeAll:Observable<TModel[]>;

    //contiene el path de la coleccion o subcoleccion
    pathCollection: string;
    //determina si se requiere usar subCollectionGroup
    //que son querys especiales que agrupan todas las subcolecciones
    //con el mismo nombre de una coleccion o subcoleccion padre
    isCollectionGroup:boolean;

    //almacena los docs que se estan rastreando
    listDocs: TModel[];

    //array que contendrá un todos los snapshotDocs
    //claves para paginacion por medio del metodo startAt()
    snapshotStartDocs: any[];

    //lleva el control de las paginas que se han paginado
    currentPageNum: number;

    //puede contener una copia del limite de paginacion
    //normal (para la mayoria de tipos de paginacion) o
    //contienen el acumulado de limite que se aumenta
    //dinamicamente cuando se usa el tipo de paginacion
    //acumulativa
    accumulatedLimit: number;

    //contiene toda la informacion especifica para
    //construir la query
    QFilter:IQFilter;

    //las funciones next(), error() (y complete()
    //opcional) que se ejecutan una suscrito al
    //observable correspondiente
    RFSs:IRunFunSuscribe<TModel>[];

    //funcion que se ejecuta antes de entregar los
    // doc leidos para customizarlos y enriquezerlos
    preGetDoc:(doc:TModel, v_PreGet:any)=>TModel;
}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IpathControl$*/
//permite la declaracion de objetos control$ enfocado
//query especifica de consulta de un doc por medio del
//_pathDoc que continene todo lo necesario para consultar
//y monitorear cambios
export interface IpathControl$<TModel> {

    observables: Observable<TModel | TModel[]>[];
    subscriptions: Subscription[];

    populateOpc?:{
        //observable resultante de la union del 
        //array de observables por medio de MergeAll()
        //se usa principalmente para la populate
        //en casos en donde se desee agrupar (merge) todos
        //los observables correspondientes al array
        obsMergeAll:Observable<TModel | TModel[]>;  

        listDocsPopulate?:TModel[];
        limit:number;
        currentPageNum:number;
        _pathDocs:string[];

        typePaginate:ETypePaginatePopulate;
        
    };

    //las funciones next(), error() (y complete()
    //opcional) que se ejecutan una suscrito al
    //observable correspondiente
    RFS:IRunFunSuscribe<TModel>;

    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    v_PreGet:any;

    //funcion que se ejecuta antes de entregar los
    // doc leidos para customizarlos y enriquezerlos
    preGetDoc:(doc:TModel, v_PreGet:any)=>TModel;

}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IRunFunSuscribe*/
//permite construir objetos con las propiedades de tipo funcion
//que se ejecutan cuando se suscribe cada observable de los
//objetos control$
export interface IRunFunSuscribe<TModel>{
    next: (docsRes: TModel[] | TModel) => void;
    error: (err:any) => void;
    complete?:() => void;
}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*FSModelService*/
//es una especie de clase abstracta que no es un servicio (no se inyecta)
//simplemente intenta complementar de funcionalidad (metodos especialmente) a los
//services reales que se usarán, esta clase es padre de todos los services
// que se dediquen a CRUD de docs de firebase
//esta tipada con:
//
//TModel:
//hace referencia a la CLASE modelo generica
//
//TIModel:
//hace referencia a la INTERFAZ modelo generica
//RECORDAR: la interfaz generica es tambien tipada para extender sus funcionalidades,
//para este caso TIModedo se espera recibir como TIModelo<any>, ya que es generica.
//
//TModel_Meta:
//Hace referencia los metadatos del modelo
//
//TIModel_IQValue:
//IMPORTANTE: recibe un tipado con sintaxis: TIModel<IQValue_Modelo>
//Recordar: IQValue_Modelo  tipado especial enfocado a los valores
//necesarios para construir la query
//================================================================================================================================
export class FSModelService<TModel, TIModel, TModel_Meta, TIModel_IQValue> {

    //================================================================
    /*Propiedades Principales */
    //U_afs:
    //objeto referencial a BD de firestore, el objeto se DEBE DECLARAR
    //en cada service que herede de esat clase, ya que el  _afs  original
    //es inyectable, y se debe pasar a esta clase como referencia en el
    //constructor del service hijo.
    protected U_afs: AngularFirestore;

    //contiene metadata del modelo
    public Model_Meta:TModel_Meta;

    //Flag que determina cuando esta listo el servicio para
    //realizar operaciones CRUD
    protected isServiceReady:Boolean;

    //contenedor de objetos control$ de services foraneos
    //a este service 
    protected f_Controls$:IControl$<unknown>[];
    protected f_pathControls$:IpathControl$<unknown>[];

    //almacena un limite de docs leidos estandar para TODAS LAS QUERYS,
    //sin embargo se puede cambiar este numero en la propiedad QFiltro.limite
    //por default es 50
    protected defaultPageLimit:number;

    protected defaultLimitPopulate:number;

    //Control$ generico asignado para este servicio (se usa en servicios donde
    //no se requiera crear diferentes controls$ para monitorear lecturas, 
    //solo con este generico bastaria) 
    public g_Control$:IControl$<TModel>;
    public g_pathControl$:IpathControl$<TModel>;

    //================================================================
    //
    constructor() {
        this.isServiceReady = false;
        this.defaultPageLimit = 50;
        this.defaultLimitPopulate = 10;

        this.f_Controls$ = [];
        this.f_pathControls$ = [];        
    }
    //================================================================================================================================
    /*ready()*/
    //es un metodo especial que determina (devolviendo una promesa)
    //cuando el servicio esta listo para realizar consultas (lecturas)
    //a firestore, SE DEBE encapsular toda consulta (hecha desde un 
    //service o un component) en la promesa devuelta por este metodo
    public ready():Promise<void>{
        
        //almacena la suscripcion de los controls foraneos
        let f_subsCombine:Subscription

        //determinar si ya esta listo el servicio
        //para que sea desactive el monitoreo
        if (this.isServiceReady) {

            //simula devolver una promesa pero en
            //realidad esta se ejecuta inmediatamente
            return Promise.resolve();
             
        } else {
            return new Promise<void>((resolve, reject)=>{

                //determinar si existen Controls$ foraneos que monitorear
                //de lo contrario no crear ningun observable combinado
                if (this.f_Controls$.length > 0 || this.f_pathControls$.length > 0) {

                    //contenedor de todos los observables de control$
                    //foraneos (sean control$ o pathControl$)
                    let f_obsMerges:Observable<any>[] = []; 
                    
                    //cargar los observables control$ (si los hay)
                    for (let i = 0; i < this.f_Controls$.length; i++) {
                        f_obsMerges.push(this.f_Controls$[i].obsMergeAll);
                    }

                    //cargar los observables pathControl$ (si los hay)
                    for (let i = 0; i < this.f_pathControls$.length; i++) {
                        
                        if (!this.f_pathControls$[i].populateOpc || 
                            this.f_pathControls$[i].populateOpc == null
                        ) {
                            //si no es poblar, solo agrega el primer observable
                            f_obsMerges.push(this.f_pathControls$[i].observables[0]);
                        } else {
                            //si es poblar agrega el mergeAll() de los observables
                            f_obsMerges.push(this.f_pathControls$[i].populateOpc.obsMergeAll);
                        }
                        
                    }                    

                    //combinar y suscribirse para saber cuando se 
                    //ejecutaron TODOS los observables de los control$_ext
                    // por primera vez (no se tiene en cuenta cuando se 
                    //crearon cada control$ ya que en ese momento se 
                    //devuelve un empty() como observable, que no es 
                    //detectado por este combineLastest()  )
                    f_subsCombine = combineLatest(f_obsMerges)                    
                    .subscribe({
                        next:(d)=>{
                            //se desuscribe al momento justo de detectar que 
                            //ya no hay mas control$_ext que monitorear por primera vez
                            f_subsCombine.unsubscribe(); 

                            this.isServiceReady = true;                    
                            resolve();
                        },
                        error:(FSerr)=>{
                            reject(FSerr);
                        },
                    });

                } else {
                    //si no hay controls$ externos 
                    //no se puede hacer un monitoreo
                    this.isServiceReady = true;                    
                    resolve();                   
                }
            });
        }
    }

    //================================================================================================================================    
    /*createPartialControl$()*/
    //retorna una instancia parcial de control$
    protected createPartialControl$(
        RFS:IRunFunSuscribe<TModel>, 
        preGetDoc:(doc:TModel, v_PreGet:any)=>TModel
    ):IControl$<TModel>{    

        //preinstanciar el control$a devolver
        let control$ = <IControl$<TModel>>{
            behaviors:[],
            observables:[],
            subscriptions:[],
            obsMergeAll:null,

            RFSs:[RFS],
            preGetDoc:preGetDoc,
            QFilter:{}
        };

        //se crean las propiedades referente a los observadores, asignando 
        //un behavior inicial sin Qfilter ( null )  para que no haga la consulta 
        //inicial, los monitoreadores behaviors y observables se inicializan 
        //con el primer elemento del primero del array contenedor
        control$.behaviors[0] = new BehaviorSubject<IQFilter>(null);
        control$.observables[0] = this.getObsQueryControl(control$, 0);

        //recordando que subscriptions es un contenedor bidimensional por lo tanto se hace
        //push a la primera suscripcion encerrada en []
        control$.subscriptions.push([control$.observables[0].subscribe(control$.RFSs[0])]);

        //este mergeAll() permite agregar funcionalidad externa a
        //los observales del control$, es ideal para la paginacion full
        //aqui se asigna inicialmente para cualquier tipo de paginacion,
        //sin embargo en la paginacion full se estará continueamente actualizando
        //para agregar los nuevos observadores 
        control$.obsMergeAll = from(control$.observables).pipe(mergeAll());      

        return control$;

    }

    /*createPartialPathControl$()*/
    //retorna una instancia parcial de control$
    protected createPartialPathControl$(
        RFS:IRunFunSuscribe<TModel>,
        preGetDoc:(doc:TModel, v_PreGet:any)=>TModel
    ):IpathControl$<TModel>{   

        //preinstanciar el control$ a devolver     
        let pathControl$ = <IpathControl$<TModel>>{
            observables:[],
            subscriptions:[],            

            RFS:RFS,
            preGetDoc:preGetDoc
        };

        //crea un nuevo observador en el index 0, no se requeriran mas observables
        //pero se hace por array ya que en poblar si se requieren varios observables
        //
        //IMPORTANTE: se envia como _pathDoc  un  null  ya que solo se crea inicialmente
        //el obsebale pero no se desea realizar por ahora ninguna consulta a firestore
        pathControl$.observables[0] = this.getObsQueryPathControl(pathControl$, null)
        pathControl$.subscriptions[0] = pathControl$.observables[0].subscribe(pathControl$.RFS);

        return pathControl$;
    }
    
    //================================================================================================================================
    /*METODOS DE LECTURA GENERICA:*/
    //================================================================
    /* readControl$()*/
    //es un metodo especial que extrae la mayor parte de la funcionalidad generica
    //de los metodos de lectura tipo CRUD para firestore, tomando como base la
    //configuracion preestablecidad en el control$  recibido.
    //RECORDAR:
    //como las lecturas se ejecutan reactivamente con la ayuda de behaviors, toda
    //lectura que se realice se considera <<nueva lectura>> con lo cual se
    //le esta diciendo al behavior que la controla que se le asignará un nuevo filtro.
    //El metodo readControl() es capaz de detectar si dentro del   control$  su  behavior
    //(o grupo de behaviors si es paginacion full) es nuevo para configurarlo inicialmente o
    //si ya se a preestablecido un behavior con su correspondiente next()
    //
    //Devuelve el control doc$ ya modificado
    //Parametros:
    //
    //control$:
    //SE DEBE RECIBIR el objeto con la configuracion ya preconstruida de behaviors, 
    //observables, suscriptions y demas propiedades relevantes para construir 
    //una consulta y su paginacion en firestore
    //
    //QFilter:
    //contiene la nueva configuracion correspondiente a la nueva lectura (entre sus propiedades
    //esta el tipo de paginacion, el limite, valQuerys, docInicial, entre otras)
    //
    //RFS:
    //contiene las funciones next() y error() (e incluso si se necesita el complete()) para ejecutar una vez
    //error-> al igual que next es una funcion que para cargar en el metodo suscribe()
    //y la cual esat definida en la clase que inyecte este servicio
    //
    //path_EmbBase:
    //solo util para emb_subColecciones y se debe recibir si se desea consultar sin collection group

    protected readControl$(
        control$:IControl$<TModel>,
        QFilter:IQFilter,
        path_EmbBase:string=null
    ):IControl$<TModel>{

        //================================================================
        //reiniciar todas las propiedades del control$ necesarias para 
        //cada lectura

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

        //cast obligado:
        const col_Meta = <IMetaColeccion><unknown>this.Model_Meta;
        control$.pathCollection = 
            (col_Meta.__isEmbSubcoleccion) ?
            this.getPathCollection(path_EmbBase) :
            this.getPathCollection();  

        control$.isCollectionGroup = 
            (col_Meta.__isEmbSubcoleccion && (!path_EmbBase || path_EmbBase == null)) ? 
            true : false;     

        //configuracion de filtro y carga de query:
        control$.QFilter = QFilter;

        //configurar propiedades utilitarias:
        control$.listDocs = [];
        control$.snapshotStartDocs = [control$.QFilter.startDoc];
        control$.currentPageNum = 0;
        control$.accumulatedLimit = control$.QFilter.limit;

        //================================================================

        switch (control$.QFilter.typePaginate) {

            //si se requiere personalizar el inicio de 
            //cada lectura nueva, es necesario crear los case independientes
            case ETypePaginate.No:
            case ETypePaginate.Single:  
            case ETypePaginate.Accumulative:                          
                    //================================================================
                    //configuracion de lectura para tipo de paginacion: 
                    //No, Single, Accumulative 
                    control$.behaviors[0].next(control$.QFilter);
                    //================================================================
                break;

            case ETypePaginate.Full:
                    //================================================================
                    //configuracion de lectura para paginacion full

                    //al ser una nueva lectura se debe asegurar de reinicializar TODOS 
                    //los bhaviors observables y suscrptions que se hubieren usado 
                    //en este control$ en anteriores lecturas
                    //tambien asegurarse que los array esten con el mismo tamaño
                    if (control$.behaviors.length == control$.subscriptions.length) {

                        //conteo decremental mientras elimina los behaviors y
                        //suscripciones que ya no se necesitan puesto que es
                        //una lectura nueva, tener en cuenta que el primer
                        //behavior y suscripcion NO SE ELIMINAN
                        while (control$.subscriptions.length > 1) { //garantiza que el primero no se elimina
                            
                            for (let i = 0; i < control$.subscriptions[control$.behaviors.length - 1].length; i++) {
                                control$.subscriptions[control$.behaviors.length - 1][i].unsubscribe();                                
                            }
                            //control$.subscriptions[control$.behaviors.length - 1].unsubscribe();
                            control$.subscriptions.pop();
                            control$.observables.pop();
                            control$.behaviors.pop()
                        }

                        //cargar el nuevo filtro en el primer behavior
                        control$.behaviors[0].next(control$.QFilter);

                        //actualiza en obsMergeAll ya que se debe eliminar todo rastro de la lectura pasada
                        control$.obsMergeAll = from(control$.observables).pipe(mergeAll());   

                    }
                    //================================================================
                break;

            default:
                break;
        }

        return control$;
    }

    //================================================================
    /*getObsQueryControl():*/
    //configura y devuelve el observable encargado monitorear la ultima lectura
    //Parametros:
    //control$:
    //el control que contiene el array de behaviors para crear el observable
    //
    //idxBehavior:
    //Especifica el index del behaior al cual se le creará un observable
    //(es indispensable cunado se usa paginacion full, en las demas siempre es 0)
    private getObsQueryControl(
        control$:IControl$<TModel>, 
        idxBehavior:number
    ): Observable<TModel[]> {
        //el pipe y el switchMap cambiar el observable dinamicamente cada vez que se
        //requiera un nuevo filtro por medio de control$.behaviors.next()
        return control$.behaviors[idxBehavior]
            .pipe(switchMap((QFilter) => {

                //================================================
                //Determina si no existe filtro de Query para ignorar
                // la busqueda (puede darse cuando se requiere solo 
                //instanciar el observable al inicio )
                if (!QFilter || QFilter == null) {
                    //devuelve un observable vacio
                    //empy() permite que los observables
                    //asociados ignoren el evento cuando
                    //se crea el control$
                    return empty();  
                }
                //================================================
                //idxPag almacena un indice dinamico de la pagina a la
                //que corresponde el observable (su uso es indispensable
                //para la paginacion full)
                let idxPag = control$.currentPageNum;
                //================================================

                //================================================================
                //configuracion inicial para la lectura de docs en OPCION COLECCION
                //debe ya ESTAR ASIGNADO el valor de la porpiedad _pathColeccion
                //antes de solicitar la consulta
                //el callback   (ref)=>{}   permite la creacion del cursor de consulta
                //e implementar el filtro.
                //QFiltro.query contiene la funcion donde se configura y se devuleve
                //la query para ser enviada a firestore

                try {
                    let afsColQuery = (!control$.isCollectionGroup) ?
                        this.U_afs.collection(control$.pathCollection, (ref) => control$.QFilter.query(ref))
                        :
                        this.U_afs.collectionGroup(control$.pathCollection, (ref) => control$.QFilter.query(ref));

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
                                //de acuerdo a las necesidades
                                data = control$.preGetDoc(data, control$.QFilter.v_PreGet);
                                //================================================================
                                return data;
                                //return { _id, ...data };
                                
                            });
                            //================================================================
                            //determina la forma en que se entregaran los datos de acuerdo
                            //a si se deben paginar y que tipo de paginacion (estandar o full)
                            switch (control$.QFilter.typePaginate) {
                                case ETypePaginate.No:
                                        //--falta---
                                        control$.listDocs = docsLeidos;
                                    break;

                                case ETypePaginate.Single:
                                        if (docsLeidos.length > 0) {
                                            //este es un documento especial entregado por firestore
                                            //que se debe usar para los metodos starAt() o starAfter
                                            //en las querys a enviar en firestore
                                            const snapShotDoc = actions[actions.length - 1].payload.doc
                                            //como es paginacion estandar solo se requiere la pagina actual
                                            control$.snapshotStartDocs[control$.currentPageNum + 1] = snapShotDoc;
                                            
                                        }
                                        control$.listDocs = docsLeidos;
                                        //------------------------[EN CONSTRUCCION]------------------------
                                        //falta si se quiere conservar los docs leidos
                                        //anteriormente pero no monitoriados por observables
                                        //docsLeidos = doc$.listDocs.concat(docsLeidos);
                                        //----------------------------------------------------------------

                                    break;

                                case ETypePaginate.Accumulative:
                                        //-falta---
                                        control$.listDocs = docsLeidos;
                                    break;

                                case ETypePaginate.Full:
                                        //si no hubo datos leidos no cargue el documento especial
                                        if (docsLeidos.length > 0) {
                                            //este es un documento especial entregado por firestore
                                            //que se debe usar para los metodos starAt() o starAfter
                                            //en las querys a enviar en firestore
                                            const snapShotDoc = actions[actions.length - 1].payload.doc
                                            //el idxPag el control especial que cada observable creado tiene asignado
                                            control$.snapshotStartDocs[idxPag + 1] = snapShotDoc;
                                        }
                                        //================================================================
                                        //doc$.listDocs, contiene una copia de TODOS los docs monitoriados
                                        //de TODOS los observables que se han creado para la paginacion full.
                                        //
                                        //se intenta dividir el doc$.listDocs en 2 arrays independientes
                                        //iniListDocsParcial ,  finListDocsParcial ; para que ne el medio
                                        //sea concatenado los docs de la nueva pagina, (teniendo en cuenta
                                        //que la division no se hace cuando  doc$.listDocs esta vacio o cuando
                                        //se esta detectando la ultima pagina); esto se logra por medio del
                                        //idxPag que permite calcular el idx de particion.
                                        let iniIdxSeccion = idxPag * control$.accumulatedLimit;
                                        let finIdxSeccion = (idxPag + 1) * control$.accumulatedLimit;

                                        let iniListDocsParcial: TModel[] = [];
                                        let finListDocsParcial: TModel[] = [];

                                        if (control$.listDocs.length >= iniIdxSeccion) {
                                            iniListDocsParcial = control$.listDocs.slice(0, iniIdxSeccion);
                                        }
                                        if (control$.listDocs.length >= finIdxSeccion) {
                                            finListDocsParcial = control$.listDocs.slice(finIdxSeccion);
                                        }
                                        //================================================================
                                        //se re-arma doc$.listDocs con los nuevos docs (o con las modificaciones)
                                        //recordando que este codigo se ejecuta ya se por que se realizó una nueva
                                        //consulta o por que el observable detecto alguna modificacion de algun doc

                                        const lsD = iniListDocsParcial.concat(docsLeidos).concat(finListDocsParcial);
                                        if (lsD.length > 0) {
                                            control$.listDocs = this.eliminarItemsDuplicadosArray(lsD, "_id"); //-- solo para _id personalizados
                                        } else {
                                            control$.listDocs = [];
                                        }
                                        //================================================================
                                        //administracion de memoria de observables para la paginacion reactiva full
                                        //desuscribe los observables que no estan siendo utilizados, ya que cada vez
                                        //que exista una modificacion en algun documento (especificamente eliminacion)
                                        //puede darse el caso que se hallan eliminado muchos docs lo cual dejaria 1 o
                                        //mas observables monitoriando  vacios []  , para evitar esto este fragmento
                                        //de codigo analiza si existen observables que esten rastreando   vacios[]
                                        //y los desuscribe y elimina

                                        //determinar si la cantidad de docs rastreados por pagina es
                                        //inferior a la cantidad de paginas representada en numPaginaActual
                                        //(que a su vez son obserbales), de ser asi indica que existen
                                        //observables que rastrean vacios y se deben desuscribir y eliminar

                                        let pagRealEntero = (control$.listDocs.length / control$.QFilter.limit) + 1;
                                        let pagActualEntero = control$.currentPageNum + 1;

                                        //para dejar almenos el ultimo observable vacio 
                                        //monitoreando se usa comparador   >   pero si se 
                                        //quiere ser estricto se debe usar   >=  
                                        if (pagActualEntero > pagRealEntero) { 

                                            //el diferencial determina cuantos observables de mas estan rastreando vacios
                                            let diferencialExcesoMemoria = Math.floor(pagActualEntero / pagRealEntero);
                                            for (let i = 0; i < diferencialExcesoMemoria; i++) {

                                                //liberar memoria de obserbables rastreando vacios uno a uno
                                                //----------------[EN CONSTRUCCION]----------------
                                                const countSubscrip = control$.subscriptions[control$.subscriptions.length - 1].length;
                                                for (let i = 0; i < countSubscrip; i++) {
                                                    control$.subscriptions[control$.subscriptions.length - 1][i].unsubscribe();                                                    
                                                }
                                                //------------------------------------------------
                                                //control$.subscriptions[control$.subscriptions.length - 1].unsubscribe();
                                                
                                                control$.subscriptions.pop();
                                                control$.observables.pop();
                                                control$.behaviors.pop();
                                                control$.snapshotStartDocs.pop();

                                                control$.currentPageNum--;
                                                
                                            }
                                            //reiniciar los mergeAll despues d eliberar memoria
                                            control$.obsMergeAll = from(control$.observables).pipe(mergeAll());   
                                        }
                                        //================================================================
                                        docsLeidos = control$.listDocs;
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
            }))
    }

    //================================================================================================================================
    /*readPathControl$()*/
    //metodo especial solo usado para cargar nueva
    //lectura con el unico query de buscar por _pathDoc
    //y devolver SOLO UN doc o null
    //Parametros
    //
    //pathDoc$:
    //contiene el control$ con la configuracion base (o null si es por primera vez),este control$
    //contiene el observable, suscription y demas propiedades para rastrear el doc a leer
    //
    //RFS:
    //contiene las funciones next() y error() (e incluso si se necesita el complete()) para ejecutar una vez
    //error-> al igual que next es una funcion que para cargar en el metodo suscribe()
    //y la cual esat definida en la clase que inyecte este servicio
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //
    //preGetDocs:
    //funcion que se ejecuta antes de entregar los
    // doc leidos para customizarlos y enriquezerlos
    //
    //_pathDoc:
    //en este metodo NO SE REQUIERE un pathColeccion ya que este metodo apunta a leer un documento
    //por medio de un _pathDoc en el cual explicitamente va incluido el pathColeccion (incluso puede
    //ir el path de una coleccion y de varias subcolecciones dependiendo de que tan profundo
    //este el doc), por lo tanto se pasa un _pathDoc con el formato:
    //"/NomColeccion/{id}/nomSubColeccion/{id}..../nomSubColeccion_N/{_id_N}"
    //(RECORDAR:siempre debe terminar el _pathDoc en un _id)
    protected readPathControl$(
        pathControl$:IpathControl$<TModel>,
        v_PreGet:any,
        preGetDoc:(doc:TModel, v_PreGet:any)=>TModel,
        _pathDoc: string = null
    ): IpathControl$<TModel> {

        //================================================================
        //inicializar todas las propiedades del pathControl$
        //necesarias para  la lectura
        pathControl$.v_PreGet = v_PreGet;
        pathControl$.preGetDoc = preGetDoc;
        pathControl$.populateOpc = undefined; //no es poblar

        //desactiva la anterior suscripcion para establecer la nueva
        pathControl$.subscriptions[0].unsubscribe();

        //================================================================        
        //crea un nuevo observador en el index 0, no se requeriran mas observables
        //pero se hace por array ya que en poblar si se requieren varios observables
        pathControl$.observables[0] = this.getObsQueryPathControl(pathControl$, _pathDoc)
        pathControl$.subscriptions[0] = pathControl$.observables[0].subscribe(pathControl$.RFS);

        return pathControl$;
    }
    //================================================================
    /*getObservableQueryDocPathId*/
    //configura y devuelve el observable encargado monitorear la ultima
    //lectura este metodo es de acceso rapido para consultar SOLO UN DOCUMENTO
    //por medio de su _id
    private getObsQueryPathControl(pathControl$:IpathControl$<TModel>, _pathDoc:string): Observable<TModel | TModel[]> {

        //================================================
        //Determina si no existe _pathDoc de Query para ignorar
        // la busqueda (puede darse cuando se requiere solo 
        //instanciar el obserbale al inicio )
        if (!_pathDoc || _pathDoc==null) {
            //devuelve un observablde de array de TModel vacio
            return of(null) as Observable<TModel | TModel[]>;
        }
        //================================================
        //solo para la opcion de poblar, el index NO es .length-1
        let idxObs = pathControl$.observables.length;
        //================================================
        //a diferencia de getObservableQueryDoc() aqui la consulta es mas sencilla
        //no se requiere configuracion de query externa, la consulta se hace a base
        //de documento y no de coleccion y no se requiere obtener metadata especial
        //de firestore como snapShotDocument (a no ser que se requiera el _id automatico 
        //de firestore o requiera un documento snapShot)
        const doc_afs = <AngularFirestoreDocument<TModel>>this.U_afs.doc<TModel>(_pathDoc);
        return doc_afs.valueChanges().pipe(map(doc => {

            //determinar si NO es un poblar:
            if (!pathControl$.populateOpc) {
                return pathControl$.preGetDoc(doc, pathControl$.v_PreGet);
            }
            //ejecutar la funcion preGetDocs para customizar los datos
            //de acuerdo a las necesidades
            pathControl$.populateOpc.listDocsPopulate[idxObs] = pathControl$.preGetDoc(doc, pathControl$.v_PreGet);
            return pathControl$.populateOpc.listDocsPopulate;
        }));

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
    }

    //================================================================================================================================
    /*paginteControl$()*/
    //este metodo determina el tipo de paginacion y ejecuta una
    //consulta especial con el filtro modificado solo para paginacion
    //Parametros:
    //
    //doc$:
    //contiene el control$ con la configuracion base (o null si es por primera vez),este control$
    //contiene los behaviors, observables, suscriptions y demas propiedades para rastrear los docs a leer
    //
    //direccionPaginacion:
    //un string con 2 opciones "previo" | "siguiente", algunos tipos de paginacion solo soportan "siguiente"
    protected paginteControl$(
        control$:IControl$<TModel>,
        pageDirection: "previousPage" | "nextPage"
    ):IControl$<TModel>{

        //para paginar basta con tener el filtro del
        //ultimo behavior activo )
        const idxUltimoBh = control$.behaviors.length - 1;
        const QFiltro = control$.behaviors[idxUltimoBh].getValue();

        switch (control$.QFilter.typePaginate) {
            case ETypePaginate.No:
                 //NO SE PAGINA
                break;

            case ETypePaginate.Single:
                    //================================================================
                    //la paginacion reactiva Simple tiene la opcion de tener
                    //pagina siguiente y anterior y en cada opcion solo es necesario
                    //pasar el filtro con la configuracion para paginar por medio del
                    //metodo next() y actualizar el numero de la pagia actual
                    if (pageDirection == "nextPage" &&
                        control$.listDocs.length == QFiltro.limit) {

                        QFiltro.startDoc = control$.snapshotStartDocs[control$.currentPageNum + 1];
                        control$.behaviors[0].next(QFiltro);
                        control$.currentPageNum++;
                    }
                    if (pageDirection == "previousPage" &&
                        control$.listDocs.length > 0 && control$.currentPageNum > 0) {

                        QFiltro.startDoc = control$.snapshotStartDocs[control$.currentPageNum - 1];
                        control$.behaviors[0].next(QFiltro);
                        control$.currentPageNum--;
                    }
                    //================================================================

                break;

            case ETypePaginate.Accumulative:
                    //================================================================
                    //la paginacion reactiva Acumulativa SOLO  tiene la opcion de tener
                    //paginar siguiente y solo es necesario pasar el filtro con la
                    //configuracion para paginar por medio del metodo next() y actualizar
                    // el numero de la pagina actual
                    //Tambien para poder paginar siguiente es necesario que la cantidad
                    //de docs almacenados en doc$.listDocs sea igual doc$.limiteAcumulado
                    //ya que si es inferior se deduce que no es necesario seguir
                    //solicitando mas docs
                    if (pageDirection == "nextPage" &&
                        control$.listDocs.length == control$.accumulatedLimit) { //RECORDAR:es control$.accumulatedLimit y no QFiltro.limit

                        //actualizar el limite acumulado
                        control$.accumulatedLimit += QFiltro.limit;
                        QFiltro.limit = control$.accumulatedLimit;
                        control$.behaviors[0].next(QFiltro);
                        control$.currentPageNum++; //llevar este contador de pagina para este caso es opcional
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
                        let limiteLote = (control$.currentPageNum + 1) * QFiltro.limit;
                        if (control$.listDocs.length == limiteLote) {

                            QFiltro.startDoc = control$.snapshotStartDocs[control$.currentPageNum + 1];
                            control$.currentPageNum++;
                            control$.behaviors.push(new BehaviorSubject<IQFilter>(QFiltro));
                            control$.observables.push(this.getObsQueryControl(control$, control$.behaviors.length - 1));
                            
                            //--------[EN CONSTRUCCION]--------
                            let acumSuscriptions:Subscription[]=[];
                            for (let i = 0; i < control$.RFSs.length; i++) {
                                acumSuscriptions.push(control$.observables[control$.observables.length - 1].subscribe(control$.RFSs[i]));                              
                            }
                            control$.subscriptions.push(acumSuscriptions)                            
                            //--------------------------------

                            //control$.subscriptions.push(control$.observables[control$.observables.length - 1].subscribe(control$.RFSs));

                            //actualizar la propiedad control$.obsMergeAll es importante 
                            //para este tipo de paginacion
                            //por cada pagina nueva se hace un nuevo mergeAll de todos los
                            //observables en el array
                            control$.obsMergeAll = from(control$.observables).pipe(mergeAll());                              
                        }
                    }
                break;

            default:
                break;
        }

        return control$;
    }
    //================================================================================================================================
    /*populateControl$()*/
    //permite el poblar documentos refernciado en campos con 
    //prefijo  fk_  que almacenan rutas _pathDoc de este modelo
    //este metodo se usa como paso intermedio en caso de desear
    //personalizarlo exclusivamente para este servicio
    //
    //Parametros:
    //
    //pathControl$:
    //objeto control$ con la configuracion de observables y subscriciones
    //que se usen para poblar
    //
    //fk_pathDocs:
    //contiene el o los strings de _pathDoc que hacen referencia a otros documentos
    //si es es un slo string indica que el campo   fk_  esta relacionado con otra 
    //coleccion en modo 1a1 o 0a1, si es un array indica que el campo fk_ esta 
    //relacionado con otra coleccion como  0aMuchos o 1aMuchos 
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //se pude recibir un null
    //
    //preGetDoc:
    //funcion que se ejecuta antes de entregar los
    //doc leidos para customizarlos y enriquezerlos
    //
    //typePaginatePopulate:
    //por medio de la enum  ETypePaginatePopulate  determina
    //el tipo de paginacion a usar para poblar el pathControl$
    //
    //limitPopulate:
    //si se desea un limite personalizado para la paginacion de poblar
    protected populateControl$(
        pathControl$: IpathControl$<TModel>,
        fk_pathDocs: string | string[],        
        v_PreGet:any,
        preGetDoc:(doc:TModel, v_PreGet:any)=>TModel,
        typePaginatePopulate:ETypePaginatePopulate,
        limitPopulate?:number
    ): IpathControl$<TModel> {


        //­­­___ <TEST> _____________________________________
        //New:

        //se analiza si es un pathControl$ ya usado para reiniciarlo
        if (pathControl$.observables.length > 0 &&
            pathControl$.subscriptions.length > 0
        ) {
            //desusbscripcion factorizada:
            //ideal para reiniciar un poblar o paginarlo en modo single
            pathControl$ = <IpathControl$<TModel>>FSModelService.unsubscribePartialPathControl$(pathControl$);
        }

        //seguro para determinar que si el _pathDocs NO es un array
        //se active automaticamente la   ETypePaginatePopulate.No  
        //eliminando cualquier tipo de programacion previamente programado
        typePaginatePopulate = (Array.isArray(fk_pathDocs)) ?
            typePaginatePopulate :
            ETypePaginatePopulate.No;

        //se reinicia las opciones de populate para este pathControl$
        pathControl$.populateOpc = {
            _pathDocs : (Array.isArray(fk_pathDocs)) ? fk_pathDocs : [fk_pathDocs],
            limit: (limitPopulate) ? limitPopulate : this.defaultLimitPopulate ,
            currentPageNum: 0, //no se pagina hasta que se hallan cargado
            listDocsPopulate: [],
            obsMergeAll:null,
            typePaginate:typePaginatePopulate
        };

        //comienza la creacion de los observables y su correspondiente subscripcion
        //se analiza que se creen tantos como el   limit  y  la cantidad de   _pathDocs
        //lo permitan
        while (
            pathControl$.populateOpc._pathDocs.length > 0 &&
            pathControl$.populateOpc.limit > pathControl$.subscriptions.length &&
            pathControl$.populateOpc._pathDocs.length > pathControl$.subscriptions.length             
        ) {

            const idx_sub_obs = pathControl$.subscriptions.length;
            pathControl$.observables.push(this.getObsQueryPathControl(pathControl$, pathControl$.populateOpc._pathDocs[idx_sub_obs]));
            pathControl$.subscriptions.push(pathControl$.observables[idx_sub_obs].subscribe(pathControl$.RFS));
        }

        pathControl$.populateOpc.obsMergeAll = from(pathControl$.observables).pipe(mergeAll());

        //________________________________________________
        //Old:

        // //================================================
        // //convertir (si es necesario) _pathDocs en array
        // _pathDocs = (Array.isArray(_pathDocs)) ? _pathDocs : [_pathDocs];

        // //================================================================
        // //verificar si NO existe un pathControl$  anterior con configuracion 
        // //previa de  populateOpc  lo cual indica que es inicial
        // if (!pathControl$.populateOpc || pathControl$.populateOpc == null) {

        //     //================================================================
        //     //inicializar todas las propiedades del pathControl$
        //     //necesarias para el poblar       
        //     pathControl$.v_PreGet = v_PreGet;
        //     pathControl$.preGetDoc = preGetDoc;
        //     pathControl$.populateOpc = {
        //         obsMergeAll: null,
        //         limit: limitePopulate,
        //         currentPageNum: 0, //no se pagina hasta que se hallan cargado
        //         listDocsPopulate: [],
        //         _pathDocs: _pathDocs
        //     };

        //     while (
        //         pathControl$.populateOpc._pathDocs.length > 0 &&
        //         pathControl$.populateOpc._pathDocs.length > pathControl$.observables.length &&
        //         pathControl$.populateOpc.limit > pathControl$.observables.length
        //     ) {

        //         const i = pathControl$.observables.length;
        //         pathControl$.observables.push(this.getObsQueryPathControl(pathControl$, _pathDocs[i]));
        //         pathControl$.suscriptions.push(pathControl$.observables[i].subscribe(pathControl$.RFS));
        //     }

        //     pathControl$.populateOpc.currentPageNum++;

        //     pathControl$.populateOpc.obsMergeAll = from(pathControl$.observables).pipe(mergeAll());

        // } else {
        //     const limiteLote = pathControl$.populateOpc.limit * pathControl$.populateOpc.currentPageNum;
        //     if (pathControl$.observables.length == limiteLote &&
        //         pathControl$.populateOpc._pathDocs.length > limiteLote) {

        //         while (pathControl$.populateOpc._pathDocs.length > pathControl$.observables.length &&
        //             (pathControl$.populateOpc.limit + limiteLote) > pathControl$.observables.length
        //         ) {

        //             const i = pathControl$.observables.length;
        //             pathControl$.observables.push(this.getObsQueryPathControl(pathControl$, _pathDocs[i]));
        //             pathControl$.suscriptions.push(pathControl$.observables[i].subscribe(pathControl$.RFS));
        //         }

        //         pathControl$.populateOpc.currentPageNum++;

        //         pathControl$.populateOpc.obsMergeAll = from(pathControl$.observables).pipe(mergeAll());
        //     }
        // }
        // //================================================================
        //________________________________________________
                   
        return pathControl$;
    }

    /*pagitanePopulateControl$()*/
    //es para paginacion basica de populate, por ahora solo redirecciona
    //al metodo principal pagitanePopulateControl$(), aqui se uede implementar
    //logica personalizada para cada paginacion, si se desea
    //
    //Parametros:
    //pathControl$:
    //el objeto contrl$ con los observables y suscripciones de cada
    //populate
    //
    //pageDirection
    // las 2 opciones de direccion de paginar (no en todos los 
    //typePaginate se pueden usar)
    protected pagitanePopulateControl$(
        pathControl$:IpathControl$<TModel>,
        pageDirection: "previousPage" | "nextPage"
    ):IpathControl$<TModel>{

        if (!pathControl$.populateOpc) {
            return pathControl$;
        }

        switch (pathControl$.populateOpc.typePaginate) {
            
            
            case ETypePaginatePopulate.No:                
                break;

            case ETypePaginatePopulate.Single:

                //pagina anterior
                if (pageDirection == "previousPage" &&
                    pathControl$.subscriptions.length == pathControl$.observables.length &&
                    pathControl$.populateOpc._pathDocs.length > 0 &&
                    pathControl$.populateOpc.currentPageNum > 0 //el control de paginas se realiza con logica desde 0
                ) {
                    //const utilitarias:
                    const limit = pathControl$.populateOpc.limit;
                    const currentPage = pathControl$.populateOpc.currentPageNum;   
                    const numPathDocs = pathControl$.populateOpc._pathDocs.length;
                    //desusbscripcion factorizada:
                    //ideal para reiniciar un poblar o paginarlo en modo single
                    pathControl$ = <IpathControl$<TModel>>FSModelService.unsubscribePartialPathControl$(pathControl$);

                    //los nuevos observables y sus correspondientes subscripciones
                    //son asignados en lotes de acuerdo al   limit  que se halla configurado
                    //RECORDAR:
                    //en este tipo de paginacion los index de los observables y subscriptions 
                    //NO corresponden al orden del array   _pathDocs para permitir la navegacion 
                    //de nextpage y previouspage
                    //
                    //se declaran los index de inicio y fin  en que se asignara
                    //los nuevos observables y sus correspondientes subscripciones
                    let idx_pathDoc = (currentPage-1) * limit;
                    const end_idx_pathDoc = currentPage * limit;
                    while (idx_pathDoc < end_idx_pathDoc && idx_pathDoc < numPathDocs) {

                        const idx_sub_Obs = pathControl$.subscriptions.length;
                        pathControl$.observables.push(this.getObsQueryPathControl(pathControl$, pathControl$.populateOpc._pathDocs[idx_sub_Obs]));
                        pathControl$.subscriptions.push(pathControl$.observables[idx_sub_Obs].subscribe(pathControl$.RFS));
                        
                        idx_pathDoc++;
                    }
                    
                    //se agrupan los observables con un mergeAll, para propositos generales
                    pathControl$.populateOpc.obsMergeAll = from(pathControl$.observables).pipe(mergeAll());

                    //se actualiza el numero de pagina actual (recordar que es con logica 0)
                    pathControl$.populateOpc.currentPageNum--;

                }

                if (pageDirection == "nextPage" && 
                    pathControl$.subscriptions.length == pathControl$.observables.length &&
                    pathControl$.populateOpc._pathDocs.length > (pathControl$.populateOpc.limit * pathControl$.populateOpc.currentPageNum)
                ) {

                    //const utilitarias:
                    const limit = pathControl$.populateOpc.limit;
                    const currentPage = pathControl$.populateOpc.currentPageNum;   
                    const numPathDocs = pathControl$.populateOpc._pathDocs.length;

                    //desusbscripcion factorizada:
                    //ideal para reiniciar un poblar o paginarlo en modo single
                    pathControl$ = <IpathControl$<TModel>>FSModelService.unsubscribePartialPathControl$(pathControl$);

                    //los nuevos observables y sus correspondientes subscripciones
                    //son asignados en lotes de acuerdo al   limit  que se halla configurado
                    //RECORDAR:
                    //en este tipo de paginacion los index de los observables y subscriptions 
                    //NO corresponden al orden del array   _pathDocs para permitir la navegacion 
                    //de nextpage y previouspage
                    //
                    //se declaran los index de inicio y fin  en que se asignara
                    //los nuevos observables y sus correspondientes subscripciones                    
                    let idx_pathDoc = currentPage * limit;
                    const end_idx_pathDoc = (currentPage+1) * limit;
                    while (idx_pathDoc < end_idx_pathDoc && idx_pathDoc < numPathDocs) {

                        const idx_sub_Obs = pathControl$.subscriptions.length;
                        pathControl$.observables.push(this.getObsQueryPathControl(pathControl$, pathControl$.populateOpc._pathDocs[idx_sub_Obs]));
                        pathControl$.subscriptions.push(pathControl$.observables[idx_sub_Obs].subscribe(pathControl$.RFS));
                        
                        idx_pathDoc++;
                    }
                    
                    //se agrupan los observables con un mergeAll, para propositos generales
                    pathControl$.populateOpc.obsMergeAll = from(pathControl$.observables).pipe(mergeAll());

                    //se actualiza el numero de pagina actual (recordar que es con logica 0)
                    pathControl$.populateOpc.currentPageNum++;
                }
                break;      
                
            case ETypePaginatePopulate.Accumulative:

                if (pageDirection == "nextPage" &&
                    pathControl$.populateOpc._pathDocs.length > pathControl$.populateOpc.limit * pathControl$.populateOpc.currentPageNum
                ) {
                    //const utilitarias:
                    const limit = pathControl$.populateOpc.limit;
                    const currentPage = pathControl$.populateOpc.currentPageNum;   
                    const numPathDocs = pathControl$.populateOpc._pathDocs.length;
                    const accumulativeLimit = limit * currentPage;
        
                    //los nuevos observables y sus correspondientes subscripciones
                    //son asignados al final del array correspondiente de forma acumulativa
                    //hasta determinar que no sobrepasen el limite acumulativo o  la cantidad
                    //de _pathDocs   que existan 
                    //RECORDAR:
                    //en este tipo de paginacion los index de los observables y subscriptions 
                    //SI corresponden al orden del array   _pathDocs 
                    while (pathControl$.subscriptions.length < accumulativeLimit &&
                        pathControl$.subscriptions.length < numPathDocs
                    ) {
                        const idx_sub_Obs = pathControl$.subscriptions.length;
                        pathControl$.observables.push(this.getObsQueryPathControl(pathControl$, pathControl$.populateOpc._pathDocs[idx_sub_Obs]));
                        pathControl$.subscriptions.push(pathControl$.observables[idx_sub_Obs].subscribe(pathControl$.RFS));
                    }

                    pathControl$.populateOpc.obsMergeAll = from(pathControl$.observables).pipe(mergeAll());

                    pathControl$.populateOpc.currentPageNum++;
                }                

                break;                     
        
            default:
                break;
        }

        return pathControl$;
    }
    //================================================================================================================================

    protected createDocFS(newDoc: TModel, pathCollection:string): Promise<void> {
        const _id = newDoc["_id"]; //esto para ids personalizados
        const refColletion = this.U_afs.collection<TModel>(pathCollection);
        return refColletion.doc(_id).set(newDoc, { merge: true });
    }

    protected updateDocFS(updatedDoc: TModel, pathCollection:string): Promise<void> {
        const _id = updatedDoc["_id"]; //esto para ids personalizados
        const refColletion = this.U_afs.collection<TModel>(pathCollection);
        return refColletion.doc(_id).update(updatedDoc);
    }

    protected deleteDocFS(_id: string, pathCollection:string): Promise<void> {
        const refColletion = this.U_afs.collection<TModel>(pathCollection);
        return refColletion.doc(_id).delete();
    }

    //================================================================
    /*metodos de desuscripcion de observables*/
    //para ahorrar memoria, se usa tipado unknown para recibir cualquier
    //control$ sea externo o interno al service

    //estos metodos estaticos y reciben controls$ tipo unknown
    //para permitir desuscribir varios control$ agrupados en array 
    //de diferentes servicios
    public static unsubscribeControl$(controls$:IControl$<unknown>[]):void {
                
        if (controls$.length == 0) {
            return; //si docs$ esta vacio no ejecutar nada   
        }

        for (let i = 0; i < controls$.length; i++) {
            while (controls$[i].subscriptions.length > 0) {
                //--------[EN CONSTRUCCION]--------
                const countSubscrip = controls$[i].subscriptions.length;
                for (let i = 0; i < countSubscrip; i++) {
                    controls$[i].subscriptions[controls$[i].behaviors.length - 1][i].unsubscribe();
                }
                //--------------------------------
                //controls$[i].subscriptions[controls$[i].behaviors.length - 1].unsubscribe();
                
                controls$[i].subscriptions.pop();
                controls$[i].observables.pop();
                controls$[i].behaviors.pop();
            }
            //No deja docs almacenados:
            controls$[i].listDocs = [];                    
        }
        return;
    }

    public static unsubscribePathControl$(pathControls$:IpathControl$<unknown>[]):void {

        if (pathControls$.length == 0) {
            return; //si pathDocs$ esta vacio no ejecutar nada   
        }

        for (let i = 0; i < pathControls$.length; i++) {

            //desusbscripcion factorizada:
            pathControls$[i] = FSModelService.unsubscribePartialPathControl$(pathControls$[i]);

            //No deja docs almacenados si es poblar:
            if (pathControls$[i].populateOpc) {
                pathControls$[i].populateOpc = undefined; 
            }              
        }       
        return;
    }

    /*unsubscribePartialPathControl$()*/
    //metodo especial que factoriza parte de la desubscripcion 
    //de un pathControl$ para facilitar la utilizacion cuando 
    //se requiere populate o en la desubscripcion estandar
    //Parametros:
    //
    private static unsubscribePartialPathControl$(
        pathControl$:IpathControl$<unknown>
    ):IpathControl$<unknown>{

        //conteo decremental mientras elimina los observables y
        //suscripciones que ya no se necesitan 
        // SE ELMINAN TODOS
        while (pathControl$.observables.length > 0) {
            pathControl$.subscriptions[pathControl$.observables.length - 1].unsubscribe();
            pathControl$.subscriptions.pop();
            pathControl$.observables.pop();
        }        

        return pathControl$;
    }


    public unsubscribe_g_Control$():void{
        FSModelService.unsubscribeControl$([this.g_Control$]);
    }

    public unsubscribe_g_pathControl$():void{
        FSModelService.unsubscribePathControl$([this.g_pathControl$]);
    }

    /*ADVERTENCIA:*/
    //solo se debe usar en los casos donde se requiera desuscribirse a TODO
    //lo referente a este servicio, incluyendo los f_Controls$  y el g_Control$, 
    //si se desea conservar estos controls$ vitales para el funcionamiento del servicio
    //es mejor usar los metodos de desuscripcion detallados como:
    //   unsubscribeControls$(), unsubscribePathControls$() y demas... 
    public unsubscribeAll$(controls$:IControl$<unknown>[], pathControls$:IpathControl$<unknown>[]):void {
        
        //================================================
        //determinar si se envio un array de controls$        
        controls$ = (Array.isArray(controls$)) ? controls$ : [];
        pathControls$ = (Array.isArray(pathControls$)) ? pathControls$ : [];        
        
        //================================================
        //se adicionan los control$ genericos    
        controls$.push(this.g_Control$);
        pathControls$.push(this.g_pathControl$);

        //================================================
        //se adicionan los control$ foraneos (si existen)
        if (this.f_Controls$.length > 0) {
            controls$ = controls$.concat(this.f_Controls$);
        }
        if (this.f_Controls$.length > 0) {
            pathControls$ = pathControls$.concat(this.f_pathControls$);
        }
        //================================================
        //se desuscriben y eliminan TODOS los controls$ 
        FSModelService.unsubscribeControl$(controls$);

        //tambien los pathControls$
        FSModelService.unsubscribePathControl$(pathControls$);
        //================================================

        //dejar como no listo el servicio
        this.isServiceReady = false;
    }

    //================================================================================================================================
    /*Utilitarios*/
    //================================================================
    /*addRFStoControl$()*/
    //permite adicionar una funcion RFS (o mas llamandolo varias veces)
    //al control$ y subscribirlas inmediatamente (ideal para el g_control$ )
    public addRFStoControl$(
        control$:IControl$<TModel>,
        RFS:IRunFunSuscribe<TModel>
    ):IControl$<TModel>{
        
        //se agrega como referencia al control$
        control$.RFSs.push(RFS);

        //se subscribe a TODOS los obsevables que posea este control$
        //se hace de esta manera ya que en la paginacion full pueden existir muchos
        //observables que requieren la misma RFS
        for (let i = 0; i < control$.observables.length; i++) {
            control$.subscriptions[i].push(control$.observables[i].subscribe(RFS));         
        }

        return control$;
    }
    //================================================================
    /*createModel()*/
    //retorna un objeto del modelo con los campos inicializado
    public createModel():TModel{
        let Model = <TModel>{};
        for (const c_m in this.Model_Meta) {
            //garantizar que sean campos del modelo
            if(this.Model_Meta[c_m]["nom"] && this.Model_Meta[c_m]["default"]){
                Model[<string>c_m] = this.Model_Meta[c_m]["default"];
            }
        }
        return Model;
    }
    //================================================================
    /*getPathCollection()*/
    //obtener el path de la coleccion o subcoleccion,
    //en las colecciones devuelve el mismo nom ya qeu son Raiz
    //Parametros:
    //
    //pathBase ->  path complemento para construir el el path completo
    //             util para las subcolecciones
    public getPathCollection(pathBase:string=""):string{
        //cast obligado:
        const col_Meta = <IMetaColeccion><unknown>this.Model_Meta;

        return (col_Meta.__isEmbSubcoleccion && pathBase != "") ?
            `${pathBase}/${col_Meta.__nomColeccion}` :
            `${col_Meta.__nomColeccion}`;

    }    

    //================================================================
    /*createIds()*/
    //generar _ids personalizados con base en tiempo para documentos firebase
    protected createIds():string{

        //================================================================
        // obtener la fecha en UTC en HEXA,:  
        //obtener la diferencia horaria del dispositivo con respecto al UTC 
        //con el fin de garantizar la misma zona horaria. 
        // getTimezoneOffset() entrega la diferencie en minutos, es necesario 
        //convertirlo a milisegundos    
        const difTime = new Date().getTimezoneOffset() * 60000; 
        //se obtiene la fecha en hexa par alo cual se resta la diferencia 
        //horaria y se convierte a string con base 16
        const keyDate = (Date.now() - difTime).toString(16);  
        //================================================================
        // el formtato al final que obtengo es:
        //  n-xxxxxxxxxxxxxxxx
        //donde  n   es el numero   _orderkey  y las  x   son el hexa  generado por el uuid
        let key = v4();
        key = key.replace(/-/g, ""); //quitar guiones
        key = key.slice(16); //quitar los 16 primeros bytes para que no sea tan largo el path de busqueda
        key = `${keyDate}-${key}`;
        return key;

        //================================================================

    }

    //================================================================
    /*create_pathDoc()*/
    //a partir de un _id crea una ruta path de un documento especifico,
    //en el caso de las subColecciones SIEMPRE será requiere de 
    //un path_EmbBase  SOLO PARA SUBCOLECCIONES
    public create_pathDoc(_id:string, path_EmbBase?:string):string{
        return `${this.getPathCollection(path_EmbBase || "")}/${_id}`;;
    }

    //================================================================
    /*formatearDoc()*/
    //permite depurar y eliminar campos que no seran almacenados en la
    //base de datos (como los campos virtuales)
    //Parametros:
    //
    //Doc:
    //el documento a formatear (tambien seria el   map  a formatear
    //si se esta usando recursivamente)
    //
    //modelo_Util
    //el objeto util de la correspondiente coleccion (o map si se usa
    //recusrivamente) para determinar los atributos de cada campo
    //(si son maps o embebidos o virtuales)
    //
    //isEdicionFuerte
    //indica si se desea que los maps (por ahora solo los maps sencillos)
    //se les realice "edicion fuerte" lo que indica que se reemplazan
    //TODOS los campos del map sin excepcion, en la edicion debil
    //(predefinida con false) solo se modifican los campos del map que
    //realmente hallan tenido cambio de valor
    //
    //path
    //SOLO SE USA EN LLAMADOS RECURSIVOS, indica la ruta que se desea agregar a
    //los campos  de los  map a editar por medio de una ruta:
    //"map_campo.subcampo1.subcampo11.subcampoN"
    //por lo tanto desde un llamado externo al recursivo se debe dejar con el valor predeterminado de  ""
    protected formatearDoc(Doc: TModel | any, modelo_Meta:TModel_Meta, isEdicionFurte=false, path=""):TModel{

        //================================================================
        //se asignan los objetos tipados a variables temporales
        //de tipo any para usar caracteristicas fuera de typescript
        let mod_M = <any> modelo_Meta;
        let DocResult = <TModel>{};
        //================================================================

        for (const c in Doc as TModel) {
            for (const c_U in mod_M) {
                if (c == c_U && c != "constructor") {

                    const m_u_campo = <IMetaCampo<any, any>>mod_M[c];
                    //================================================
                    //retirar los campos virtuales
                    if (m_u_campo.isVirtual) {
                        continue;
                    }
                    //================================================
                    //retirar los campos embebido.
                    //Los campos embebido NO pueden agregarse a firestore
                    //desde la coleccion padre, deben ser agregado o modificado
                    //desde la propia subcoleccion
                    if(m_u_campo.isEmbebido){
                        continue;
                    }
                    //================================================
                    //================================================================
                    //formatear campos de tipo   map
                    if (m_u_campo.isMap) {
                        if (m_u_campo.isArray && Array.isArray(Doc[c])) {
                            //================================================================
                            //IMPORTANTE: al 07/19 Firestore NO permite ediciones sobre elementos
                            //de un array por lo tanto toda edicion se hace de caracter fuerte
                            //TODOS los elementos del array seran REEMPLAZADOS o ELIMINADOS
                            //================================================================

                            const aDoc = <any>Doc[c];
                            const raDoc = [];
                            for (let i = 0; i < aDoc.length; i++) {
                                raDoc.push(this.formatearDoc(aDoc[i], m_u_campo.extMeta));
                            }
                            DocResult[c] = <any>raDoc;
                            continue;
                        } else {
                            if (isEdicionFurte) {
                                DocResult = Object.assign(DocResult, this.formatearDoc(Doc[c], m_u_campo.extMeta, isEdicionFurte, `${path}${c}.`));
                            } else {
                                DocResult[c] = <any>this.formatearDoc(Doc[c], m_u_campo.extMeta);
                            }
                            continue;
                        }
                    }
                    //================================================================

                    //...aqui mas campos especiales a formatear...

                    //================================================
                    //formatear campos normales
                    if(isEdicionFurte){
                        DocResult[`${path}${c}`] = Doc[c];
                    }else{
                        DocResult[c] = Doc[c];
                    }
                    //================================================
                }
            }
        }

        return DocResult;
    }

    /*formatearCampos()*/
    //--esta dañado--//
    protected formatearCampos(Doc:TModel | any, modelo_Meta:TModel_Meta):TModel{
        for (const c in Doc) {
            for (const c_U in modelo_Meta) {
                if (c == c_U && c != "constructor") {

                    const m_u_campo = <IMetaCampo<any, any>>modelo_Meta[c];
                    //================================================
                    //determinar si el campo tienen la propiedad para formatear

                    // if(m_u_campo.formateoCampo){
                    //     //================================================
                    //     //los campos embebidos No se formatean por ahora
                    //     if(modelo_Meta[c].isEmbebido){
                    //         continue;
                    //     }
                    //     //================================================
                    //     //los campos map y arrayMap se
                    //     //formatean recursivamente
                    //     if(m_u_campo.isMap){
                    //         if (m_u_campo.isArray && Array.isArray(Doc[c])) {
                    //             for (let i = 0; i < Doc[c].length; i++) {
                    //                 Doc[c][i] = this.formatearCampos(Doc[c][i], m_u_campo.util);
                    //             }
                    //         } else {
                    //             Doc[c] = this.formatearCampos(Doc[c], m_u_campo.util);
                    //         }
                    //         continue;
                    //     }
                    //     //================================================
                    //     //los campos array basico tienen se
                    //     //formatean recursivamente
                    //     if(m_u_campo.isArray && Array.isArray(Doc[c])){
                    //         for (let i = 0; i < Doc[c].length; i++) {
                    //             Doc[c][i] = this.formatearCampos(Doc[c][i], m_u_campo.util);
                    //         }
                    //         continue;
                    //     }
                    //     //================================================
                    //     //Formatear campo normal:
                    //     Doc[c] = m_u_campo.formateoCampo(Doc[c]);
                    // }

                    //================================================
                }
            }
        }
        return Doc;
    }

    //================================================================
    /*copiarData()*/
    //clonacion de objetos JSON a  diferentes niveles de profundidad
    //CUIDADO CON EL STACK, NO PUEDE SER MUY PROFUNDO
    protected copiarData(data:any | any[]):any | any[]{

        let dataCopia:any;

        if (typeof(data) == "object" || Array.isArray(data)) {
            if (Array.isArray(data)) {
                dataCopia = [];
                for (let i = 0; i < data.length; i++) {
                    dataCopia[i] = this.copiarData(data[i]);
                }
            }else{
                dataCopia = {};
                for (const key in data) {
                    if (typeof(data[key]) == "object" || Array.isArray(data[key])) {
                        dataCopia[key] = this.copiarData(data[key]);
                    }else{
                        dataCopia[key] = data[key];
                    }
                }
            }
        } else {
            dataCopia = data;
        }
        return dataCopia;
    }

    //================================================================
    /*ajustarDecimale()*/
    //redondea un numero y ajusta decimales, tomado del sitio oficial:
    //https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/Math/round
    //Parametros:
    //type-> "round" redondeo estandar (arriba si es >=5 y abajo si es <5)
    //       "floor" redondeo abajo
    //       "ceil" redondeo arriba
    //
    //numValue-> numero a redondear
    //exp -> decenas o decimales a redondear,
    //       para las decenas (decenas exp=1, centena exp=2, miles exp=3...) se usan numeros positivos
    //       para las decimales (decimas exp=-1, centecimas exp=-2, milesimas exp=-3...) se usan numeros negativos
    //       si exp es 0 ejecuta la operacion de redondeo por default de la libreria Math
    protected ajustarDecimales(type:"round" | "floor" | "ceil", numValue:any, exp:number):number{

        //determinar si  exp no esta definido para que
        //no haga ninguna operacion
        if(typeof exp === 'undefined' || exp==null){
            return numValue;
        }

        // Si el exp es cero...
        if (+exp === 0) {
        return Math[type](numValue);
        }
        numValue = +numValue; //+numValue intentar convertir a numero cualquier cosa
        exp = +exp; //+exp intentar convertir a numero culaquier cosa

        // Si el valor no es un número o el exp no es un entero...
        if (isNaN(numValue) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
        }
        // Shift
        numValue = numValue.toString().split('e');
        numValue = Math[type](+(numValue[0] + 'e' + (numValue[1] ? (+numValue[1] - exp) : -exp)));
        // Shift back
        numValue = numValue.toString().split('e');
        numValue = +(numValue[0] + 'e' + (numValue[1] ? (+numValue[1] + exp) : exp));
        return numValue;
    }   
    //================================================================
    /*getLlaveFinBusquedaStrFirestore()*/
    //obtener llave para la condición del búsqueda limite mayor para
    //campos string en firestore
    protected getLlaveFinBusquedaStrFirestore(llaveInicial:string):string{

        let llaveFinal:string = llaveInicial.substring(0, llaveInicial.length-1);
        let charIni:string = llaveInicial.charAt(llaveInicial.length-1);
        let charFin:string;

        //detectar los caracteres "estorbo" de mi hermoso idioma
        if (/[ñÑáéíóúÁÉÍÓÚü]/.test(charIni)) {
            charFin = charIni=="ñ" ? "o" : charIni; //--¿que pasa con ..ñó..?
            charFin = charIni=="Ñ" ? "O" : charIni; //--¿que pasa con ..ÑÓ..?
            charFin = charIni=="á" ? "b" : charIni;
            charFin = charIni=="é" ? "f" : charIni;
            charFin = charIni=="í" ? "j" : charIni;
            charFin = charIni=="ó" ? "p" : charIni;
            charFin = charIni=="ú" ? "v" : charIni;
            charFin = charIni=="Á" ? "B" : charIni;
            charFin = charIni=="É" ? "F" : charIni;
            charFin = charIni=="Í" ? "J" : charIni;
            charFin = charIni=="Ó" ? "P" : charIni;
            charFin = charIni=="Ú" ? "V" : charIni;
            charFin = charIni=="ü" ? "v" : charIni;
        } else {
            //para evitar recorrer todo el alfabeto y dígitos
            //asignar el caracter siguiente (el Unicode de charIni + 1) para la búsqueda
            charFin = String.fromCharCode(charIni.charCodeAt(0) + 1);
        }
        //finalemente concatenar
        llaveFinal = llaveFinal + charFin;
        return llaveFinal;
    }

    //================================================================
    /*eliminarItemsDuplicadosArray()*/
    //verificacion y eliminacion de duplicados en un array de objetos
    //elimina los duplicados en el primer nivel en base a un campo,
    //se buscaran los objetos con el mismo valor del campo referencia
    //y se conservará solo el ultimo objeto que tenga dicho valor repetido
    //parametros:
    //data -> array que contiene los objetos a testear y eliminar su duplicado
    //campoRef -> el nombre del campo del cual por el cual se analizaran los duplicados
    //            (normalmente es el campo identificado o   _id)
    protected eliminarItemsDuplicadosArray(datos:TModel[], campoRef:string):any[]{

        if(datos.length > 0){

            let datosFiltrados:any[] = [];
            let BufferConvertidor = {};

            //tranforma cada objeto colocando como propiedad principal el
            // campoRef de la siguiente manera:
            //{"campoRef1":{...data}, "campoRefUnico2":{...data}}
            //muy parecido a como usa firebase los _id como referencia de campo
            //ya que en un objeto JSON nunca puede haber 2 campos con el mismo nombre
            for(var i in datos) {
                BufferConvertidor[datos[i][campoRef]] = datos[i];
             }

             //reconstruye el array
             for(let i in BufferConvertidor) {
                datosFiltrados.push(BufferConvertidor[i]);
             }
              return datosFiltrados;

        }else{
            return [];
        }
    }

    //================================================================================================================================
}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████


