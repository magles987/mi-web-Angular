
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument, AngularFirestoreCollectionGroup } from '@angular/fire/firestore';
import { Observable, observable, Subject, BehaviorSubject, from, fromEvent, of, Subscription, interval, timer, combineLatest } from 'rxjs';
import { map, switchMap, mergeAll, concatAll, concatMap, mergeMap, mapTo, toArray, concat } from 'rxjs/operators';

//permite crear los _ids personalizados
import { v4 } from "uuid";

//================================================================================================================================
/*ENUMERACIONES E ITERFACES*/
//================================================================================================================================
/*IValQ*/
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
export interface IValQ{
    val?: any;
    ini?: string;
    min?: number;
    max?: number;
    
    _orden:"asc"|"desc"; 
    //...mas propiedades en comun....
}

//================================================================================================================================
/*EtipoPaginar*/
//establece los tipos basicos de paginacion para firestore, se debe
//tener en cuenta que paginar no es lo mismo que limitar
//TODA query debe tener asignado un limite, esto no significa que toda 
//query requiera paginarse
export enum EtipoPaginar {
    //indica que la consulta no se pagina (ideal para consultas que se 
    //sabe que devuelve 1 solo doc o para querys muy especificas 
    //(como ultimoDoc$))
    No,

    //Paginacion basica que solo requiere de 1 observable del control$
    //permite direccion de paginacion  "previo" || "siguiente", por ahora 
    //no deja copia de los docs leidos en paginas anteriores o siguientes 
    //(solo se monitorea la actual)
    Simple,

    //Paginacion que acumula el limite de lectura del query y asi devolver
    //en cada paginacion la cantidad de docs previamente leidos + la nueva pagina
    //Solo permite direccion de paginacion "siguiente"
    //IMPORTANTE: este tipo de paginacion es el que consume mas lecturas en firestore    
    Acumulativa,

    //Paginacion especial que crea un behavior, observable  y suscription
    //por cada pagina que se solicite, permite monitorear TODOS los documentos 
    //previamente leidos y se autogestiona para detectar duplicados y ahorro 
    //de momoria cuando los observables estan monitoreando vacios[].
    //Esta paginacion solo permite la direccion de paginacion "siguiente"  
    Full
}
//================================================================================================================================
/*IQFiltro*/
//contiene las propiedades necesarias para construir una query estandar
//con sus filtros
//
//Tipado:
//TIModelo_IvalQ:
//IMPORTANTE: recibe un tipado con sintaxis: TIModelo<IvalQ_Modelo> 
//Recordar: <IvalQ_Modelo>tipado especial enfocado a los valores 
//necesarios para construir la query

export interface IQFiltro<TIModelo_IvalQ> {  
    
    //OBLIGATORIA, contiene la funcion query que se ejecutara para 
    //solicitar los docs a firestore de acuerdo a la construccion 
    //interna de dicha funcion    
    query:(ref:firebase.firestore.CollectionReference | firebase.firestore.Query, filtro:IQFiltro<TIModelo_IvalQ>)=>firebase.firestore.CollectionReference | firebase.firestore.Query;    
    
    //contiene un valor enum de EtipoPaginar que indica que tipo 
    //de paginacion se requiere    
    tipoPaginar: EtipoPaginar;

    //limite maximo de documentos que se deben leer 
    //(especialmente en paginacion)    
    limite:number;

    //aunque se define como any que en realidad es un snapshotDocument
    //de firestore que es necesario para determinar apartir 
    //de que documento se empieza la lectura (necesario para ambos 
    //tipos de paginacion (estandar o full))    
    docInicial:any; 

    //contiene un objeto TIModelo<IvalQ_Modelo> que almacena propiedades 
    //con valores para construiri la query, entre los mas destacados 
    //esta   _orden que indica el orden de docs,  val que contiene el 
    //valor exacto a buscar, ini valor inicial a buscar, entre otros
    valQuery:TIModelo_IvalQ | null;

}

//================================================================================================================================
/*IDoc$*/
//permite la construccion de objetos control$ que continene todo lo 
//necesario para consultar y monitorear cambios
//Tipado:
//TModelo:
//interfaz de la clase modelo
//TIModelo_IvalQ:
//IMPORTANTE: recibe un tipado con sintaxis: TIModelo<IvalQ_Modelo> 
//Recordar: <IvalQ_Modelo>tipado especial enfocado a los valores 
//necesarios para construir la query
export interface IDoc$<TModelo, TIModelo_IvalQ> {
    //objetos para rastreo y monitoreo de las querys:
    behaviors: BehaviorSubject<IQFiltro<TIModelo_IvalQ>>[];
    observables: Observable<TModelo[]>[];
    suscriptions: Subscription[];

    //contiene el path de la coleccion o subcoleccion
    pathColeccion: string;
    //determina si se requiere usar subCollectionGroup
    //que son querys especiales que agrupan todas las subcolecciones 
    //con el mismo nombre de una coleccion o subcoleccion padre
    isColeccionGrup:boolean;

    //almacena los docs que se estan rastreando
    docsList: TModelo[];

    //array que contendrá un todos los snapshotDocs 
    //claves para paginacion por medio del metodo startAt()
    snapshotDocsIniciales: any[];

    //lleva el control de las paginas que se han paginado
    numPaginaActual: number;

    //puede contener una copia del limite de paginacion 
    //normal (para la mayoria de tipos de paginacion) o 
    //contienen el acumulado de limite que se aumenta 
    //dinamicamente cuando se usa el tipo de paginacion  
    //acumulativa
    limiteAcumulado: number;

    //contiene toda la informacion especifica para 
    //construir la query
    QFiltro:IQFiltro<TIModelo_IvalQ>;

    //las funciones next(), error() (y complete() 
    //opcional) que se ejecutan una suscrito al 
    //observable correspondiente
    RFS:IRunFunSuscribe<TModelo>;
}

//================================================================================================================================
/*IDocPath_Id$*/
//permite la construccion de objetos control$ enfocado 
//query especifica de consulta de un doc por medio del 
//path_id que continene todo lo necesario para consultar 
//y monitorear cambios
export interface IDocPath_Id$<TModelo> {
    //objetos para rastreo y monitoreo de las querys:
    behavior: BehaviorSubject<string | null>;
    observale: Observable<TModelo>;
    suscription: Subscription;

    //contiene el path de la coleccion o subcoleccion
    pathColeccion:string;
}

//================================================================================================================================
/*IRunFunSuscribe*/
//permite construir objetos con las propiedades de tipo funcion
//que se ejecutan cuando se suscribe cada observable de los 
//objetos control$
export interface IRunFunSuscribe<TModelo>{
    next: (docsRes: TModelo[] | TModelo) => void;
    error: (err:any) => void;
    complete?:() => void;
}
//================================================================================================================================
/*IUtilCampo*/
//Interfaz con banderas y configuracion para cada campo de cada modelo
//Tipado:
//TCampo:
//el tipo del campo (suelen ser primitivos  excepto los campos map_ o emb_) 
//
//ext_Util:
//recibe un tipado de formato: Modelo_util (es la clase no la interfaz)
export interface IUtilCampo<TCampo, ext_Util>{

    //nom OBLIGATORIO, almacena el nombre del campo
    //en string para ser usado en vez de codigo rigido
    //en caso tal de cambiar el nombre solo se debe hacer 
    //en la clase util de cada coleccion 
    nom:string;    

    //nom que contiene toda la ruta path de los subCampos de un campo map
    //se usa para configurar querys con condiciones en estos campos
    //los campos array map no requieren esta funcioanlidad ya que 
    //las querys para cualquier campo array en firestore son muy limitadas
    nomMapPath?:string;

    //validadores es un array de objetos 
    // {
    //     validator:fn(),
    //     msg:"el mensaje"
    // }
    //donde: 
    //validator es una funcion que recibe el valor del campo 
    //y devuelve true    si la validacion paso sin problemas, y    
    //false    si hubo error de validacion
    //
    //msg es el mensaje a mostrar del erro de validacion
    validadores?:{
        validator:(campoValor:TCampo)=>boolean;  //una funcion que recibe el valor del campo, lo testea y devuelve un boolean () 
        msg:string; //un string con el mensaje
    }[];

    //es una funcion que permite asignar un formateo 
    //personalizado de cada campo del modelo (de acuerdo
    // a su tipo TCampo), basicamente aqui se aplican
    //formateadores como quitar espcacios, cambio 
    //de mayusculas a minusculas, ajustes decimales 
    //y demas formateo personalizado que se requiera
    //esta funcion se llamará automaticamente en el metodo
    //formatearDoc cuando se quiera crear o editar
    //el documento o se puede usar de forma manual 
    //(por ejemplo para formatera los valores de consulta)
    formateoCampo?:(val:TCampo | null)=>TCampo;

    //banderas que se deben activar para cada campo segun corresponda
    //un campo puede tener varias banderas
    isRequerido?:boolean;
    isArray?:boolean;      
    isEmbebido?:boolean;  //indica subcoleccion
    isFk?:boolean;
    isMap?:boolean;
    isVirtual?:boolean;

    //utilidad para los campos number 
    //determina como redondear el numero
    //y cuantos decimales asignar
    //esto por medio del metodo
    //ajustarDecimales()
    //de la clase _util,
    //si es null, no ejecuta ajuste
    expFactorRedondeo?:number | null;

    //propiedad especial para campos number 
    //(incluso los number que simulan ser boolean)
    //se usa para cuando se requiere consultar
    //un valor absoluto para generar la consulta 
    //especial de igualdad por el comportamiento 
    //extraño de firestore que no permite consultar 
    //y paginar igualdades de campos number
    //este campo almacena un numero maximo con cual 
    //poder construir la query de igualdad.
    //este factor debe estar entre 0 y 1, normalmente 
    // es 1 sin embargo si el campo almacena numeros 
    //con decimales este factor debe contar con un decimal 
    //mayor los registros del campo, ejemplo: si el campo 
    //almacena datos como 12.034 (con 3 decimales) el maximo 
    //factor debe ser   0.0001   (con 4 decimales). 
    //(para los campos que simulan ser boolean el maximo Factor es 1)
    maxFactorIgualdadQuery?:number;


    //banderas de seleccion Solo escoger un grupo
    //
    //selecUnica  o   selecMulti   se pueden cargar de 
    //forma estatica y rigida en cada campo o de forma dinamica
    //una vez se lean en la BD
    isSelecUnica?:boolean;
    selecUnica?:string[] | number[];
    isSelecMulti?:boolean;
    selecMulti?: string[] | number[];     

    //util  es una propiedad especial solo usada para
    //campos que sean de tipo map (map_ o mapA_) y 
    //subcolecciones, almacena un objeto de clase util
    //correspondiente a ese   map   o a esa subcoeccion
    util?:ext_Util;
}

//================================================================================================================================
/*CLASES*/
//================================================================================================================================
/*Service_Util*/
//es una especie de clase abstracta que no es un servicio (no se inyecta)
//simplemente intenta complementar de funcionalidad (metodos especialmente) a los
//services reales que se usarán, esta clase es padre de todos los services
// que se dediquen a CRUD de docs de firebase
//esta tipada con:
//
//TModelo:
//hace referencia a la CLASE modelo generica
//
//TIModelo:
//hace referencia a la INTERFAZ modelo generica 
//RECORDAR: la interfaz generica es tambien tipada para extender sus funcionalidades, 
//para este caso TIModedo se espera recibir como TIModelo<any>, ya que es generica.
//
//TModeloCtrl_Util:
//Hace referencia a las utilidades de controller que cada modelo DEBE TENER
//
//TIModelo_IvalQ:
//IMPORTANTE: recibe un tipado con sintaxis: TIModelo<IvalQ_Modelo> 
//Recordar: <IvalQ_Modelo>tipado especial enfocado a los valores 
//necesarios para construir la query
//================================================================================================================================
export class Service_Util<TModelo, TIModelo, TModeloCtrl_Util, TIModelo_IvalQ> {

    //================================================================
    /*Propiedades Principales */
    //U_afs:
    //objeto referencial a BD de firestore, el objeto se DEBE DECLARAR
    //en cada service que herede de esat clase, ya que el  _afs  original 
    //es inyectable, y se debe pasar a esta clase como referencia en el 
    //constructor del service hijo. 
    protected U_afs: AngularFirestore;
    
    /*ModeloCtrl_Util*/
    //contiene las funcionalidades como: generador de _ids personalizados, 
    //extraccion de duplicados y demas funcionalidades; para poderlo usar
    // dentro de esta clase es necesario crear el objeto en el service hijo 
    //en el constructor. esta propiedad DEBE TENER acceso public 
    public ModeloCtrl_Util:TModeloCtrl_Util;

    //================================================================
    //Control interno del ultimo doc para rastrear el ultimo _id
    //el cual se almacenara en ultimoID que se recomienda ser protected
    protected ultimoDoc$:IDoc$<TModelo, TIModelo_IvalQ>;
    protected ultimoID: string;
    //================================================================
    //
    constructor() {
    }

    //================================================================================================================================
    //Lectura especial y privada del ultimo doc para almacenar ultimo _id
    //esta lectura es privada y se implementa en TODAS las colecciones y subcolecciones
    //con el fin de llevar un rastreo del ultimo _id personalizado de cada coleccion y 
    //asi generar uno nuevo en secuencia al momento de crear un nuevo doc
    /*RFS_ultimo:*/
    //contiene los metodos de ejecucion next() y error() para el observable
    //del control ultimoDoc$. 
    private RFS_ultimo:IRunFunSuscribe<TModelo> = {
        next: (docsRes:TModelo[])=>{
            if (docsRes.length == 0) {
                //si no se obtuvo el ultimo doc se asume que la coleccion esta vacia
                //y se asigna un _id inicial

                //cast obligado para el objeto:ModeloCtrl_Util a Ctrl_Util
                const MC_U = <Ctrl_Util<TModelo, TIModelo, TModeloCtrl_Util>><unknown>this.ModeloCtrl_Util;
                this.ultimoID = MC_U.generarIdInicial();
            } else {
                //se obtiene el ultimo _id
                this.ultimoID = docsRes[docsRes.length - 1]["_id"];
            }
        },
        error: (err)=>{
            //cast obligado para el objeto:ModeloCtrl_Util a Ctrl_Util
            const MC_U = <Ctrl_Util<TModelo, TIModelo, TModeloCtrl_Util>><unknown>this.ModeloCtrl_Util;
            this.ultimoID = MC_U.generarIdInicial();
            //----------------[EN CONSTRUCCION]----------------
            console.log(`Error al obtener ultimo _id /n ${err}`);
            //------------------------------------------------
        }
    } 
    
    /*leerUltimoDoc:*/
    //es una lectura privada del ultimo doc para obtener y rastrear el ultimo doc de la coleccion 
    //especificamente el ultimo _id
    //
    //Parametros:
    //doc$:
    //contiene el control   this.ultimoDoc$   o si es la primera vez recibe un  null
    //pathColeccion:
    //el nombre de la coleccion o subcoleccion 
    //
    //retorna void ya que la configuracion del control es interna y siempre apunta a  this.ultimoDoc$ 
    protected leerUltimoDoc(doc$:IDoc$<TModelo, TIModelo_IvalQ> | null, pathColeccion:string):void{

        //Recordar: para el caso de una subcoleccion, esta es ES DIFERENTE que una coleccionGrup , 
        //(collectionGroup) por lo tanto esta lectura hace referencia a cada una de las 
        //subcolecciones de cada coleccion, por lo tanto se desactiva isColeccionGrup   
        const isColeccionGrup = false;

        //se construye la Query, aunque se recibe QFiltro, no es necesario ya que es
        // una consulta sin filtrado personalizado
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                      QFiltro: IQFiltro<TIModelo_IvalQ>) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            cursorQueryRef = cursorQueryRef.orderBy("_id", "desc"); //solo para _id personalizados
            cursorQueryRef = cursorQueryRef.limit(1); //se determina que SOLO DEBO LEER EL ULTIMO
            return cursorQueryRef;
        };

        //se configura QFiltro del cual las unicas propiedades necesarias son
        //query y tipoPaginar, las demas se declaran para evitar errores de tipado
        const QFiltro:IQFiltro<TIModelo_IvalQ> = {
            query : query,
            tipoPaginar : EtipoPaginar.No,
            
            docInicial : null,
            limite: 1,
            valQuery : null
        }

        //se ejecuta la lectura las modificaciones del control this.ultimoDoc$
        //y se asignan directa e internamente a si mismo
        this.ultimoDoc$ = this.leerDocs$(doc$, QFiltro, this.RFS_ultimo, pathColeccion, isColeccionGrup);

    }

    //================================================================================================================================
    /*METODOS DE LECTURA GENERICA:*/
    //================================================================
    /*leerDocs$()*/
    //es un metodo especial que extrae la mayor parte de la funcionalidad generica
    //de los metodos de lectura tipo CRUD para firestore, tomando como base la 
    //configuracion preestablecidad en el control   doc$  recibido.
    //RECORDAR:
    //como las lecturas se ejecutan reactivamente con la ayuda de behaviors, toda
    //lectura que se realice se considera <<nueva lectura>> con lo cual se 
    //le esta diciendo al behavior que la controla que se le asignará un nuevo filtro.
    //El metodo leerDocs$() es capaz de detectar si deontro del control   doc$  su  behavior 
    //(o grupo de behaviors si es paginacion full) es nuevo para configurarlo inicialmente o 
    //si ya se a preestablecido un behavior con su correspondiente next() 
    //
    //Devuelve el control doc$ ya modificado
    //Parametros:
    //
    //doc$:
    //contiene el control$ con la configuracion base (o null si es por primera vez),este control$ 
    //contiene los behaviors, observables, suscriptions y demas propiedades para rastrear los docs a leer
    //
    //IQFiltro:
    //contiene la nueva configuracion correspondiente a la nueva lectura (entre sus propiedades 
    //esta el tipo de paginacion, el limite, valQuerys, docInicial, entre otras)
    //
    //RFS:
    //contiene las funciones next() y error() (e incluso si se necesita el complete()) para ejecutar una vez
    //error-> al igual que next es una funcion que para cargar en el metodo suscribe() 
    //y la cual esat definida en la clase que inyecte este servicio 
    //
    //pathColeccion:
    //el path de la coleccio o subcoleccion
    //
    //isColeccionGrup:
    //determina si se debe tratar como coleccionGrup (mas especificamente como 
    //grupo de subcolecciones)

    protected leerDocs$(doc$:IDoc$<TModelo, TIModelo_IvalQ> | null, 
                        QFiltro:IQFiltro<TIModelo_IvalQ>, 
                        RFS:IRunFunSuscribe<TModelo>, 
                        pathColeccion:string, 
                        isColeccionGrup=false
                        ):IDoc$<TModelo, TIModelo_IvalQ>{

        //================================================================
        //inicializar todas las propiedades del control$ necesarias

        //determinar si es primera vez para inicializar todo el control$
        if (!doc$ || doc$ == null) {            
            doc$ = <IDoc$<TModelo, TIModelo_IvalQ>>{};        
            doc$.behaviors = [];
            doc$.observables = [];
            doc$.suscriptions = [];
        } 
        doc$.pathColeccion = pathColeccion;
        doc$.isColeccionGrup = isColeccionGrup;
        doc$.docsList = [];
        doc$.snapshotDocsIniciales = [QFiltro.docInicial];
        doc$.numPaginaActual = 0;
        doc$.limiteAcumulado = QFiltro.limite;
        doc$.QFiltro = QFiltro;
        doc$.RFS = RFS;
        //================================================================

        switch (doc$.QFiltro.tipoPaginar) {
            case EtipoPaginar.No:
                    //================================================================
                    //configuracion de lectura sin paginacion
                    if (doc$.behaviors.length == 0 && 
                        doc$.observables.length == 0 &&
                        doc$.suscriptions.length == 0) {
                        
                        doc$.behaviors[0] = new BehaviorSubject<IQFiltro<TIModelo_IvalQ>>(doc$.QFiltro);
                        doc$.observables[0] = this.getObservableQueryDoc(doc$, 0);
                        doc$.suscriptions[0] = doc$.observables[0].subscribe(doc$.RFS);
                    } else {
                        doc$.behaviors[0].next(doc$.QFiltro);
                    }
                    //================================================================                 
                break;

            case EtipoPaginar.Simple:
                    //================================================================
                    //configuracion de lectura para paginacion estandar
                    //se determina si es la primera vez para crear el 
                    //behavior y la suscripcion o de lo contrario 
                    //solamente cargar el nuevo filtro con next()
                    if (doc$.behaviors.length == 0 && 
                        doc$.observables.length == 0 &&
                        doc$.suscriptions.length == 0) {
                        
                        doc$.behaviors[0] = new BehaviorSubject<IQFiltro<TIModelo_IvalQ>>(doc$.QFiltro);
                        doc$.observables[0] = this.getObservableQueryDoc(doc$, 0);
                        doc$.suscriptions[0] = doc$.observables[0].subscribe(doc$.RFS);
                    } else {
                        doc$.behaviors[0].next(doc$.QFiltro);
                    }
                    //================================================================                 
                break;    

            case EtipoPaginar.Acumulativa:
                    //================================================================
                    //configuracion de lectura acumulativa
                    if (doc$.behaviors.length == 0 && 
                        doc$.observables.length == 0 &&
                        doc$.suscriptions.length == 0) {
                        
                        doc$.behaviors[0] = new BehaviorSubject<IQFiltro<TIModelo_IvalQ>>(doc$.QFiltro);
                        doc$.observables[0] = this.getObservableQueryDoc(doc$, 0);
                        doc$.suscriptions[0] = doc$.observables[0].subscribe(doc$.RFS);
                    } else {
                        doc$.behaviors[0].next(doc$.QFiltro);
                    }
                    //================================================================       
                break;

            case EtipoPaginar.Full:
                    //================================================================
                    //configuracion de lectura para paginacion full
                    //determina si es la primera vez para crear el
                    //behavior y la suscripcion o de lo contrario 
                    //hace una semi liberacion de memoria de todos los
                    //behaviors y suscriptions que se hallan usado en lecturas pasadas
                    //excepto por el primero      
                    
                    if (doc$.behaviors.length == 0 && 
                        doc$.observables.length == 0 &&
                        doc$.suscriptions.length == 0) {

                        doc$.behaviors[0] = new BehaviorSubject<IQFiltro<TIModelo_IvalQ>>(doc$.QFiltro);
                        doc$.observables[0] = this.getObservableQueryDoc(doc$, 0);
                        doc$.suscriptions[0] = doc$.observables[0].subscribe(doc$.RFS);

                    } else {
                        //asegurarse que los array esten con el mismo tamaño
                        if (doc$.behaviors.length == doc$.suscriptions.length) {

                            //conteo decremental mientras elimina los behaviors y 
                            //suscripciones que ya no se necesitan puesto que es
                            //una lectura nueva, tener en cuenta que el primer
                            //behavior y suscripcion NO SE ELIMINAN  
                            while (doc$.suscriptions.length > 1) { //garantiza que el primero no se elimina
                                doc$.suscriptions[doc$.behaviors.length - 1].unsubscribe();
                                doc$.suscriptions.pop();
                                doc$.observables.pop();
                                doc$.behaviors.pop()
                            }
                            //cargar el nuevo filtro en el primer behavior
                            doc$.behaviors[0].next(doc$.QFiltro);

                        }
                    }
                    //================================================================            
                break;                                   
        
            default:
                break;
        }
        return doc$;
    }

    //================================================================
    /*getObservableQueryDoc():*/
    //configura y devuelve el observable encargado monitorear la ultima lectura
    //Parametros:
    //doc$:
    //el control que contiene el behavior (o grupo de behaviors) para crear el observable
    //
    //idxBehavior:
    //Especifica el index del behaior al cual se le creará un observable 
    //(es indispensable cunado se usa paginacion full, en las demas siempre es 0)
    private getObservableQueryDoc(doc$:IDoc$<TModelo, TIModelo_IvalQ>, idxBehavior:number): Observable<TModelo[]> {
        //el pipe y el switchMap cambiar el observable dinamicamente cada vez que se 
        //requiera un nuevo filtro por medio de behaviorGenerico.next()
        return doc$.behaviors[idxBehavior]
            .pipe(switchMap((QFiltro) => {

                //================================================
                //idxPag almacena un indice dinamico de la pagina a la 
                //que corresponde el observable (su uso es indispensable 
                //para la paginacion full)
                let idxPag = doc$.numPaginaActual;
                //================================================

                //================================================================
                //configuracion inicial para la lectura de docs en OPCION COLECCION
                //debe ya ESTAR ASIGNADO el valor de la porpiedad _pathColeccion
                //antes de solicitar la consulta
                //el callback   (ref)=>{}   permite la creacion del cursor de consulta  
                //e implementar el filtro.
                //QFiltro.query contiene la funcion donde se configura y se devuleve
                //la query para ser enviada a firestore

                let afsColQuery = (!doc$.isColeccionGrup)? 
                                this.U_afs.collection(doc$.pathColeccion, (ref) => doc$.QFiltro.query(ref, QFiltro))
                                : 
                                this.U_afs.collectionGroup(doc$.pathColeccion, (ref) => doc$.QFiltro.query(ref, QFiltro)); 
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
                                const data = a.payload.doc.data() as TModelo;
                                return data;
                                //const _id = a.payload.doc.id; //se puede omitri si uso ids personalizados
                                //return { _id, ...data };
                            });
                            //================================================================
                            //determina la forma en que se entregaran los datos de acuerdo
                            //a si se deben paginar y que tipo de paginacion (estandar o full)
                            switch (doc$.QFiltro.tipoPaginar) {
                                case EtipoPaginar.No:
                                        //--falta---
                                    break;
                    
                                case EtipoPaginar.Simple:
                                        if (docsLeidos.length > 0) {
                                            //este es un documento especial entregado por firestore
                                            //que se debe usar para los metodos starAt() o starAfter
                                            //en las querys a enviar en firestore
                                            const snapShotDoc = actions[actions.length - 1].payload.doc
                                            //como es paginacion estandar solo se requiere la pagina actual
                                            doc$.snapshotDocsIniciales[doc$.numPaginaActual + 1] = snapShotDoc;
                                        }
                                        doc$.docsList = docsLeidos;
                                        //------------------------[EN CONSTRUCCION]------------------------
                                        //falta si se quiere conservar los docs leidos 
                                        //anteriormente pero no monitoriados por observables
                                        //docsLeidos = doc$.listDocs.concat(docsLeidos);                                   
                                        //----------------------------------------------------------------
                                        
                                    break;    
                    
                                case EtipoPaginar.Acumulativa:
                                        //-falta---
                                        doc$.docsList = docsLeidos;
                                    break;
                    
                                case EtipoPaginar.Full:
                                        //si no hubo datos leidos no cargue el documento especial
                                        if (docsLeidos.length > 0) {
                                            //este es un documento especial entregado por firestore
                                            //que se debe usar para los metodos starAt() o starAfter
                                            //en las querys a enviar en firestore
                                            const snapShotDoc = actions[actions.length - 1].payload.doc
                                            //el idxPag el control especial que cada observable creado tiene asignado
                                            doc$.snapshotDocsIniciales[idxPag + 1] = snapShotDoc;
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
                                        let iniIdxSeccion = idxPag * doc$.limiteAcumulado;
                                        let finIdxSeccion = (idxPag + 1) * doc$.limiteAcumulado;

                                        let iniListDocsParcial: TModelo[] = [];
                                        let finListDocsParcial: TModelo[] = [];

                                        if (doc$.docsList.length >= iniIdxSeccion) {
                                            iniListDocsParcial = doc$.docsList.slice(0, iniIdxSeccion);
                                        }
                                        if (doc$.docsList.length >= finIdxSeccion) {
                                            finListDocsParcial = doc$.docsList.slice(finIdxSeccion);
                                        }
                                        //================================================================
                                        //se re-arma doc$.listDocs con los nuevos docs (o con las modificaciones)
                                        //recordando que este codigo se ejecuta ya se por que se realizó una nueva 
                                        //consulta o por que el observable detecto alguna modificacion de algun doc

                                        const lsD = iniListDocsParcial.concat(docsLeidos).concat(finListDocsParcial);
                                        if (lsD.length > 0) {
                                            //cast obligado para el objeto:ModeloCtrl_Util a Ctrl_Util
                                            const MC_U = <Ctrl_Util<TModelo, TIModelo, TModeloCtrl_Util>><unknown>this.ModeloCtrl_Util;
                                            doc$.docsList = <TModelo[]>MC_U.eliminarItemsDuplicadosArray(lsD, "_id"); //-- solo para _id personalizados

                                        } else {
                                            doc$.docsList = [];
                                        }
                                        //================================================================
                                        //administracion de memoria de observables para la paginacion reactiva full
                                        //desuscribe los observables que no estan siendo utilizados, ya que cada vez
                                        //que exista una modificacion en algun documento (especificamente eliminacion)
                                        //puede darse el caso que se hallan eliminado muchos docs lo cual dejaria 1 o 
                                        //mas observables monitoriando  vacios []  , para evitar esto este fragmento
                                        //de codigo analiza si existen observables que esten rastreanso   vacios[] 
                                        //y los desuscribe y elimina
                                
                                        //determinar si la cantidad de docs rastreados por pagina es 
                                        //inferior a la cantidad de paginas representada en numPaginaActual 
                                        //(que a su vez son obserbales), de ser asi indica que existen 
                                        //observables que rastrean vacios y se deben desuscribir y eliminar
                                        let pagRealEntero = (doc$.docsList.length / doc$.QFiltro.limite) + 1;
                                        let pagActualEntero = doc$.numPaginaActual + 1;                                        
                                        if (pagActualEntero >= pagRealEntero) {
                                            
                                            //el diferencial determina cuantos observables de mas estan rastreando vacios
                                            let diferencialExcesoMemoria = Math.floor(pagActualEntero / pagRealEntero);
                                            for (let i = 0; i < diferencialExcesoMemoria; i++) {
                                                //================================================================
                                                //liberar memoria de obserbables rastreando vacios uno a uno
                                                doc$.suscriptions[doc$.suscriptions.length - 1].unsubscribe();
                                                doc$.observables.pop();
                                                doc$.suscriptions.pop();
                                                doc$.behaviors.pop();
                                                doc$.snapshotDocsIniciales.pop();
                                                doc$.numPaginaActual--;
                                                //================================================================
                                            }
                                        }                                     
                                        //================================================================
                                        docsLeidos = doc$.docsList;
                                    break;                                   
                            
                                default:
                                    break;
                            }
                            return docsLeidos;
                        })
                    );
                //================================================================                         
            }))
    }

    //================================================================================================================================
    /*/eerNewDocPath_Id*/
    //metodo especial solo usado para cargar nueva 
    //lectura con el unico query de buscar por _id
    //y devolver SOLO UN doc o null
    //Parametros
    //
    //docPath_Id$:
    //contiene el control$ con la configuracion base (o null si es por primera vez),este control$ 
    //contiene el behavior, observable, suscription y demas propiedades para rastrear el doc a leer
    //
    //RFS:
    //contiene las funciones next() y error() (e incluso si se necesita el complete()) para ejecutar una vez
    //error-> al igual que next es una funcion que para cargar en el metodo suscribe() 
    //y la cual esat definida en la clase que inyecte este servicio 
    //
    //path_id:
    //en este metodo NO SE REQUIERE un pathColeccion ya que este metodo apunta a leer un documento 
    //por medio de un path_id en el cual explicitamente va incluido el pathColeccion (incluso puede 
    //ir el path de una coleccion y de varias subcolecciones dependiendo de que tan profundo 
    //este el doc), por lo tanto se pasa un path_id con el formato: 
    //"/NomColeccion/{id}/nomSubColeccion/{id}..../nomSubColeccion_N/{_id_N}" 
    //(RECORDAR:siempre debe terminar el path en un _id)
    protected leerDocPath_Id$(docPath_Id$:IDocPath_Id$<TModelo>, 
                              RFS:IRunFunSuscribe<TModelo>, 
                              path_id:string=null
                              ):IDocPath_Id$<TModelo> {

        //================================================================
        //por primera vez inicializar del control$
        if (!docPath_Id$ || docPath_Id$ == null) {            
            docPath_Id$ = <IDocPath_Id$<TModelo>>{};        
            docPath_Id$.behavior = null;
            docPath_Id$.observale = null;
            docPath_Id$.suscription = null;
        }         
        //================================================================
        //verificar si no se a declarado el control$
        if (docPath_Id$.behavior == null ||
            docPath_Id$.observale == null ||
            docPath_Id$.suscription == null) {

            //crea un nuevo observador por medio de
            // behavior con filtro null y se suscribe
            docPath_Id$.behavior = new BehaviorSubject<string | null>(path_id);
            docPath_Id$.observale = this.getObservableQueryDocPathId(docPath_Id$)
            docPath_Id$.suscription = docPath_Id$.observale.subscribe(RFS);

        } else {
            //si ya previamente se a creado el observador
            //solamente se ejecuta el metodo next() para 
            //buscar el doc con el _id solicitado
            if (path_id && path_id != null) {
                docPath_Id$.behavior.next(path_id);
            }
        }
        return docPath_Id$;
    }
    //================================================================
    /*getObservableQueryDocPathId*/
    //configura y devuelve el observable encargado monitorear la ultima 
    //lectura este metodo es de acceso rapido para consultar SOLO UN DOCUMENTO
    //por medio de su _id
    private getObservableQueryDocPathId(docPath_Id$:IDocPath_Id$<TModelo>): Observable<TModelo> {

        return docPath_Id$.behavior
            .pipe(switchMap(filtro_Path_Id => {
            
                //determinar si se recibio el _id a consultar 
                //de lo contrario no consumir memoria creando la
                //consulta y enviandola a firestore
                if (filtro_Path_Id && filtro_Path_Id != "") {

                    //a diferencia de getObservableQueryDoc() aqui la consulta es mas sencilla
                    //no se requiere configuracion de query externa, la consulta se hace a base
                    //de documento y no de coleccion y no se requiere obtener metadata especial
                    //de firestore como snapShotDocument
                    const doc_afs = <AngularFirestoreDocument<TModelo>>this.U_afs.doc<TModelo>(filtro_Path_Id);
                    return doc_afs.valueChanges();
                } else {
                    //se devuelve un observable null
                    //ya que no se recibio el _id en el filtro 
                    return of(null);
                }

            }))
    }

    //================================================================================================================================
    /*paginarDocs()*/
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
    protected paginarDocs(doc$:IDoc$<TModelo, TIModelo_IvalQ>, 
                         direccionPaginacion: "previo" | "siguiente"):IDoc$<TModelo, TIModelo_IvalQ>{

        //para paginar basta con tener el filtro del
        //ultimo behavior activo )
        const idxUltimoBh = doc$.behaviors.length - 1;
        const QFiltro = doc$.behaviors[idxUltimoBh].getValue();

        switch (doc$.QFiltro.tipoPaginar) {
            case EtipoPaginar.No: //NO SE PAGINA
                break;

            case EtipoPaginar.Simple:
                    //================================================================
                    //la paginacion reactiva Simple tiene la opcion de tener 
                    //pagina siguiente y anterior y en cada opcion solo es necesario
                    //pasar el filtro con la configuracion para paginar por medio del 
                    //metodo next() y actualizar el numero de la pagia actual
                    if (direccionPaginacion == "siguiente" &&
                        doc$.docsList.length == QFiltro.limite) {

                        QFiltro.docInicial = doc$.snapshotDocsIniciales[doc$.numPaginaActual + 1];
                        doc$.behaviors[0].next(QFiltro);
                        doc$.numPaginaActual++;
                    }
                    if (direccionPaginacion == "previo" &&
                        doc$.docsList.length > 0 && doc$.numPaginaActual > 0) {

                        QFiltro.docInicial = doc$.snapshotDocsIniciales[doc$.numPaginaActual - 1];
                        doc$.behaviors[0].next(QFiltro);
                        doc$.numPaginaActual--;
                    }
                    //================================================================

                break;    

            case EtipoPaginar.Acumulativa:
                    //================================================================
                    //la paginacion reactiva Acumulativa SOLO  tiene la opcion de tener 
                    //paginar siguiente y solo es necesario pasar el filtro con la 
                    //configuracion para paginar por medio del metodo next() y actualizar
                    // el numero de la pagina actual
                    //Tambien para poder paginar siguiente es necesario que la cantidad
                    //de docs almacenados en doc$.listDocs sea igual doc$.limiteAcumulado 
                    //ya que si es inferior se deduce que no es necesario seguir 
                    //solicitando mas docs
                    if (direccionPaginacion == "siguiente" && 
                        doc$.docsList.length == doc$.limiteAcumulado) { //RECORDAR:es doc$.limiteAcumulado y no QFiltro.limite
                        
                        //actualizar el limite acumulado
                        doc$.limiteAcumulado += QFiltro.limite;
                        QFiltro.limite = doc$.limiteAcumulado;   
                        doc$.behaviors[0].next(QFiltro);
                        doc$.numPaginaActual++; //llevar este contador de pagina para este caso es opcional                    
                    }
                break;

            case EtipoPaginar.Full:
                    //la paginacion reactiva full NO puede tener la opcion anterior 
                    if (direccionPaginacion != "previo") {

                        //se determina el limite del lote de documento que deben leerse antes
                        //de autorizar la creacion de un nuevo behavior y una suscripcion 
                        //multiplicando la paginas actuales por el limite por pagina
                        //para autorizar es necesario que sea igual el limiteLote
                        //con la cantidad real de documentos leidos hasta el momento
                        let limiteLote = (doc$.numPaginaActual + 1) * QFiltro.limite;
                        if (doc$.docsList.length == limiteLote) {

                            QFiltro.docInicial = doc$.snapshotDocsIniciales[doc$.numPaginaActual + 1];
                            doc$.numPaginaActual++;
                            doc$.behaviors.push(new BehaviorSubject<IQFiltro<TIModelo_IvalQ>>(QFiltro));
                            doc$.observables.push(this.getObservableQueryDoc(doc$, doc$.behaviors.length - 1));
                            doc$.suscriptions.push(doc$.observables[doc$.observables.length - 1].subscribe(doc$.RFS));
                        }
                    }
                break;                                   
        
            default:
                break;
        }

        return doc$;
    }
    //================================================================================================================================

    protected crearDoc(docNuevo: TModelo, pathColeccion:string): Promise<void> {
        const _id = docNuevo["_id"]; //esto para ids personalizados
        const refColeccion = this.U_afs.collection<TModelo>(pathColeccion);
        return refColeccion.doc(_id).set(docNuevo, { merge: true });
    }

    protected actualizarDoc(docEditado: TModelo, pathColeccion:string, isEditadoFuerte = false): Promise<void> {
        const _id = docEditado["_id"]; //esto para ids personalizados
        const refColeccion = this.U_afs.collection<TModelo>(pathColeccion);
        return refColeccion.doc(_id).update(docEditado);
    }

    protected eliminarDoc(_id: string, pathColeccion:string): Promise<void> {
        const refColeccion = this.U_afs.collection<TModelo>(pathColeccion);
        return refColeccion.doc(_id).delete();
    }

    //================================================================
    //desuscribir observables pricipales
    protected unsubscribeDoc$(doc$:IDoc$<TModelo, TIModelo_IvalQ>):IDoc$<TModelo, TIModelo_IvalQ> {
        while (doc$.behaviors.length > 0) {
            doc$.suscriptions[doc$.behaviors.length - 1].unsubscribe();
            doc$.suscriptions.pop();
            doc$.observables.pop();
            doc$.behaviors.pop()
        }        
        return doc$;
    }

    protected unsubscribeDocsPath_Id$(docPath_Id$:IDocPath_Id$<TModelo>):IDocPath_Id$<TModelo> {
        docPath_Id$.suscription.unsubscribe();
        docPath_Id$.behavior = null;     
        return docPath_Id$;
    }    

    //================================================================================================================================
}

//================================================================================================================================
/*Ctrl_Util*/
//Clase abstracta con utilidades especiales enfocadas al controllers y service, 
//esta clase se debe heredar para cada Modelo_Util para poder que a cada campo 
//se le implementen utilidades especificas como: formatos, validadores y demas. 
export class Ctrl_Util<TModelo, TIModelo, TModelo_Util> {

    //================================================
    //propiedad para control de generacion de _ids 
    //personalizados determina la cantidad maxima
    // de ceros a la izquierda
    // 6 son para generar maximo 1 millon de   _ids
    //por coleccion o subcoleccion
    private _anchoIzqCeros_ids = 6 
    //================================================
    constructor() {        
    }

    //================================================================
    /*generarIds()*/
    //generar _IDs para documentos firebase 
    //Parametros:
    //_orderKey:
    //el numero del ultimo _id para generear el nuevo
    public generarIds(_orderKey: number | string):string{

        //================================================
        //en un eventual caso que se reciba un string
        //no se procesa se asume que es un _id automatico 
        //de firestore 
        if (typeof _orderKey === 'string') {
            return _orderKey;
        }        
        //================================================

        _orderKey++; //incrementar el numero

        //================================================================
        //Configurar la seccion del numero de _id  usada como _orderKey 
        //para agregar cero a izquierda

        //cantidad maxima de ceros a la izquierda
        // 6 son para 1 millon de   _ids
        //let anchoIzqCeros = 6; 

        let ancho_oK = _orderKey.toString().length;
        let st_orderkey = "0";
        if (this._anchoIzqCeros_ids <= ancho_oK) {
            st_orderkey = _orderKey.toString();
        } else {
            st_orderkey = `${st_orderkey.repeat(this._anchoIzqCeros_ids - ancho_oK)}${_orderKey.toString()}`
        }        
        //================================================================
        // el formtato al final que obtengo es:
        //  n-xxxxxxxxxxxxxxxx
        //donde  n   es el numero   _orderkey  y las  x   son el hexa  generado por el uuid
        let key = v4();
        key = key.replace(/-/g, ""); //quitar guiones
        key = key.slice(16); //quitar los 16 primeros bytes para que no sea tan largo el path de busqueda
        key = `${st_orderkey}-${key}`;
        return key;

        //================================================================
        //------------------------[EN CONSTRUCCION]------------------------
        //opcion con fecha (en caso tal de requerir mayor rigides en el orden al momento de generar _ids)
        //el formato que obtendria al final seria:
        //   n-f-xxxxxxxx     donde:
        //n es el numero incremental
        //f es la fecha en milisegundos en hexa
        //xxxxxxxx son hexa de uuid
        // let key = v4();
        // key = key.replace(/-/g, ""); //quitar guiones
        // key = key.slice(24); //quitar los 24 primeros bytes para que no sea tan largo el path de busqueda
        ////agrego la fecha en hexa por medio de  Date.now().toString(16)
        // key = `${st_orderkey}-${Date.now().toString(16)}-${key}`; 
        // return key;                
        //----------------------------------------------------------------
        //================================================================



    }
    //================================================================
    /*generarIdInicial()*/
    //Generar un _id Inicial para una coleccion vacia
    public generarIdInicial():string{
        let _idVacio = "";
        for (let i = 0; i < this._anchoIzqCeros_ids; i++) {
            _idVacio = _idVacio + "0";      
        }

        return `${_idVacio}-0000000000000000`;;
        //----------------[EN CONSTRUCCION]----------------
        //opcion con fecha:
        //return `${_idVacio}-${Date.now().toString(16)}-00000000`
        //------------------------------------------------
    }
    //================================================================
    /*getNumOrderKey()*/
    //obtener numero _orderKey para llevar orden de documentos
    //procesa el string del v_id que debe siempre tener el siguiente formato:
    //  n-xxxxxxxxxxxxxxxx
    //donde  n   es el numero   _orderkey  y las  x   son el hexa  generado por el uuid
    public getNumOrderKey(_id:string):number | string{
        const _ok:any = _id.split("-")[0]; //escoge el primer numero del string que indica el orderkey 
        if (isNaN(_ok) || _ok == "") {
            return _id;
        }      
        return parseInt(_ok);
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
    protected formatearDoc(Doc: TModelo | any, modelo_Util:TModelo_Util, isEdicionFurte=false, path=""):TModelo{

        //================================================================
        //se asignan los objetos tipados a variables temporales 
        //de tipo any para usar caracteristicas fuera de typescript
        let mod_U = <any> modelo_Util;    
        let DocResult = <TModelo>{};
        //================================================================

        for (const c in Doc as TModelo) {
            for (const c_U in mod_U) {
                if (c == c_U && c != "constructor") {

                    const m_u_campo = <IUtilCampo<any, any>>mod_U[c];
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
                                raDoc.push(this.formatearDoc(aDoc[i], m_u_campo.util));        
                            }
                            DocResult[c] = <any>raDoc;
                            continue; 
                        } else {
                            if (isEdicionFurte) {
                                DocResult = Object.assign(DocResult, this.formatearDoc(Doc[c], m_u_campo.util, isEdicionFurte, `${path}${c}.`));
                            } else {
                                DocResult[c] = <any>this.formatearDoc(Doc[c], m_u_campo.util);   
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
    //--falta--//
    protected formatearCampos(Doc:TModelo | any, modelo_Util:TModelo_Util):TModelo{
        for (const c in Doc) {
            for (const c_U in modelo_Util) {
                if (c == c_U && c != "constructor") {

                    const m_u_campo = <IUtilCampo<any, any>>modelo_Util[c];
                    //================================================
                    //determinar si el campo tienen la propiedad para formatear
                    if(m_u_campo.formateoCampo){
                        //================================================
                        //los campos embebidos No se formatean por ahora
                        if(modelo_Util[c].isEmbebido){
                            continue;
                        }
                        //================================================
                        //los campos map y arrayMap se 
                        //formatean recursivamente
                        if(m_u_campo.isMap){
                            if (m_u_campo.isArray && Array.isArray(Doc[c])) {
                                for (let i = 0; i < Doc[c].length; i++) {
                                    Doc[c][i] = this.formatearCampos(Doc[c][i], m_u_campo.util);
                                }
                            } else {
                                Doc[c] = this.formatearCampos(Doc[c], m_u_campo.util);
                            }
                            continue;
                        }            
                        //================================================
                        //los campos array basico tienen se 
                        //formatean recursivamente
                        if(m_u_campo.isArray && Array.isArray(Doc[c])){
                            for (let i = 0; i < Doc[c].length; i++) {
                                Doc[c][i] = this.formatearCampos(Doc[c][i], m_u_campo.util);
                            }
                            continue;
                        }                
                        //================================================
                        //Formatear campo normal:
                        Doc[c] = m_u_campo.formateoCampo(Doc[c]); 
                    }
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
    public copiarData(data:any | any[]):any | any[]{

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
    public ajustarDecimales(type:"round" | "floor" | "ceil", numValue:any, exp:number):number{
        
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
    public getLlaveFinBusquedaStrFirestore(llaveInicial:string):string{

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
    public eliminarItemsDuplicadosArray(datos:any[], campoRef:string):any[]{

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
}


