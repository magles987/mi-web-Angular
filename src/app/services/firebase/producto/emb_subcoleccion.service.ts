//================================================================================================================================
//los servicios en angular implementas las funciones (en muchos casos las CRUD) de los datos recibidos 
// desde firebase, en otras palabras hace las veces de controller para angular

//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, observable, Subject, BehaviorSubject, } from 'rxjs';
import { map, switchMap, } from 'rxjs/operators';

import { Iemb_SubColeccion, emb_SubColeccion } from '../../../models/firebase/producto/emb_subColeccion';
import { emb_SubColeccion_Meta} from './emb_subcoleccion_Meta';
import { FSModelService, IQValue, ETypePaginate, IQFilter,IControl$, IpathControl$, IRunFunSuscribe } from '../fs_Model_Service';

//================================================================================================================================
/*INTERFACES y ENUMs especiales para cada modelo de service*/
//Interfaces especiales para implementar contenedores de 
//objetos utilitarios para los metodos Pre  
//deben llevar el sufijo   _Modelo   del moedelo para no generar 
//conflictos con otras colecciones cuando se haga   import
//Ejemplo: Iv_PreGet{aqui el sufijo de coleccion o subcoleccion}

/*Iv_PreGet_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades externar al modelo (mas especificamente IModelo)
//para realizar calculos o enriquecer los docs leidos
//se recomienda crear objetos de esta interfaz en la 
//propiedad-funcion next de los objetos RFS
export interface Iv_PreGet_emb_SubColeccion{

}

/*Iv_PreMod_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades externar al modelo (mas especificamente IModelo) 
//para realizar calculos o enriquecer el doc a modificar (ya sea crear o editar) 
export interface Iv_PreMod_emb_SubColeccion {

}

/*IQValue_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades personalizadas para este modelo_util para 
//construir querys personalizadas y especificas
export interface IQValue_emb_SubColeccion extends IQValue{

}

//================================================================================================================================
/*SERVICE DEL MODELO*/
//los servicios en angular implementas las funciones (en muchos casos las CRUD) de los datos recibidos 
//desde firebase, en otras palabras hace las veces de controller para angular
//================================================================================================================================
//es inyectable:
@Injectable({
    providedIn: 'root'
})
//================================================================================================================================
/*{Modelo}Service*/
//las clases services para CRUD para se deben nombrar con el 
//formato en singular de la siguiente manera: 
//
//Colecciones:  class ModeloService
//SubColecciones: class Emb_ModeloService
//
export class emb_subColeccionService extends FSModelService<emb_SubColeccion, Iemb_SubColeccion<any>, emb_SubColeccion_Meta, Iemb_SubColeccion<IQValue_emb_SubColeccion>> {

    //================================================================
    //Propiedaes utilitarias

    //================================================================
    constructor(private _afs: AngularFirestore) {
        super();
        //================================================================
        //cargar la configuracion de la coleccion

        //indispensable dejar una referencia de_afs en la clase padre
        //IMPORTANTE: los servicios (como AngularFirestore) no se pueden 
        //inyectar directamente en la clase padre por problemas con super()
        super.U_afs = this._afs;

        //Objeto con metadatos de utilidad para el modelo
        this.Model_Meta = new emb_SubColeccion_Meta();

        //establece un limite predefinido para este 
        //service (es personalizable incluso se puede 
        //omitir y dejar el de la clase padre)
        //this.limitePaginaPredefinido = 10;
        //================================================================
        //--solo para TEST-------------------------------
        this.createDocsTest(false); //Normalmente en false
        //-----------------------------------------------
    }
    //================================================================================================================================
    /*Consideraciones de lecturas*/
    //
    //Observaciones:
    //la librearia de @angular/Fire hace uso de observables para leer datos ademas
    //se manejan 3 formas diferentes de leer los datos de la BD
    //
    //1. Colecciones: cuando se lee varios (array) de documentos de una misma coleccion
    //de acuerdo a algun tipo de consulta o parametro de filtrado.
    //IMPORTANTE: cuando se lee a traves de colecciones el  PATH usado en  this._afs.collection(PATH, .....)
    //SIEMPRE debe apuntar a una COLECCION, no a un documento, esta libreria comprueba rudimentariamente
    //que apunta a una coleccion cuando el  PATH  tiene un numero de ubicaciones   IMPAR  
    //   "ubicacion1{coleccion}/ubicacion2{_idDoc}/ubicacion3{subColiccion}/......."
    //
    //2. Documento:  cuando se lee 1 y solo 1 documento, normalmente consulta por id  a 
    //traves de   path   de firestore  que es de la forma  "/coleccion/{_id del doc}"
    //IMPORTANTE: cuando se lee a traves de documentos el  PATH usado en    this._afs.doc<....>(filtroPath_id)
    //se debe apuntar SIEMPRE a un DOCUMENT, no a una coleccion; esta libreria comprueba rudimentariamente
    //que apunta a un docuemnto cuando el  PATH  tiene un numero de ubicaciones   PAR 
    //   "ubicacion1{coleccion}/ubicacion2{_idDoc}/ubicacion3{subColicc}on)/ubicacion4{_idDoc}......."
    //
    //3. collectionGroup: es un caso especial (y recien implementado en 2019) que permite agrupar varias subcolecciones 
    //y poderlas consultarlas a todas a la vez, ya que anteriormente no se podia realizar esta consultas de forma nativa
    //Ejemplo de datos almacenados en una coleccion de firestore:
    // coleccion:[
    //     {
    //      _id:"xxx1"
    //      campo:"algo1",
    //      subColeccion:[
    //          {
    //             _id:"S1xxx1"
    //              subcampo:"dato1-1",
    //          },
    //          {
    //             _id:"S1xxx2"
    //              subcampo:"dato1-2",
    //          },
    //      ]
    //     },
    //     {
    //         _id:"xxx2"
    //         campo:"algo2",
    //         subColeccion:[
    //             {
    //                _id:"S2xxx1"
    //                 subcampo:"dato2-1",
    //             },
    //             {
    //                _id:"S2xxx2"
    //                 subcampo:"dato2-2",
    //             },
    //         ]
    //        },
    // ]
    //en la estructura de datos anterior, firestore de forma basica permite realizar 
    //querys en los subcampo de solo una de las 2 subcolecciones a la vez, esto 
    //limita enormemente la posibilidad de obtener informacion que este contenida 
    //en las otras subcolecciones de la misma coleccion padre.
    //Sin embargo firestore implemento el permitir consultar todas las supcolecciones por medio
    //del metodo _afs.collectionGroup() pero para esta opcion SE DEBE CREAR UNA  EXENCION 
    //(que es lo contrario a un Indice)  POR CADA CAMPO que se quiera consultar de la subcoleccion
    //
    //================================================================
    /*Metodos CRUD SOLO SUBCOLECCIONES:*/
    //Observaciones:
    //al utilizar lecturas reactivas los metodos leer de CRUD varian
    //su comportamiento ya que difieren de la metodologia MVC tradicional
    //por lo tanto los filtros y construccion de querys son pasadas como 
    //propiedades al behavior determinado 
    //
    //Para el caso de las subcolecciones los metodos de lectura PUDEN RECIBIR 
    //un pathColeccion (que seria el mejor caso) ya que al ser subcolecciones 
    //existen 2 formas de consulta: la basica que es recibiendo un pathColeccion
    //personalizado (la ideal) y la otra es asumiendo que la consulta sera por 
    //medio de collectionGroup() que requiere el path estandar entregado por 
    //la clase Emb_Modelo_util y haber establecido la EXENCION (que es 
    //un anti-indice) en firestore
    //
    //Los metodos de lectura NO DEVUELVEN LOS DOCS LEIDOS, devuelven un 
    //objeto control$ de tipo IDoc$<TModelo, TIModelo_IvalQ> que contiene 
    //TODO lo referente a la lectura reactiva (behaviors, observables, 
    //suscriptions, limites, tipo de paginacion filtros querys y demas) 
    //dentro de este control$ se almacena un RFS que contiene las 
    //funciones que se ejecutan una vez obtenidos los docs
    //es la razon de que todas lso metodos de lectura tengan la terminacion  $
    /*get$()*/
    //permite obtener todos los docs de una coleccion, es el metodo base de 
    //lectura con el cual se puede construir las demas consultas
    //Parametros:
    //doc$:
    //objeto control$ con toda la informacion de la lectura reactiva (aunque 
    //puede recibirse  null  si es la primera vez)
    //
    //RFS:
    //objeto con las funciones next() y error() para ejecutar una vez este suscrito
    //
    //QValue:
    //recibe un objeto creado a partir de la interfaz IModelo<IQValue_Modelo>
    //que a su vez contiene los valores necesarios para construir la query
    //(valores como:  buscar, rangos, iniciales, entre otros)
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //
    //path_EmbBase:
    //se debe recibir para determinar que tipo de query se procesara
    //si se envia el path personalizado se entenderá que es query de 
    //subColeccion basica pero si se recibe null se entendera que es
    //query de tipo colletcionGroup()
    //
    //limite:
    //indica el numero maximo de docs que puede leer en la query, si no se
    //recibe se le asigna el limite predefinido para todas las querys
    //
    //docInicial:
    //solo es necesario recibirlo si por alguna razon se quiere paginar 
    //No teniendo como base los snapshotsDocs sino otra cosa    
    //================================================================

    public get$(
        control$:IControl$<emb_SubColeccion, Iemb_SubColeccion<IQValue_emb_SubColeccion>>,
        QValue: Iemb_SubColeccion<IQValue_emb_SubColeccion> | null,
        v_PreGet:Iv_PreGet_emb_SubColeccion | null,
        path_EmbBase:string = null, //Obligatorios para subcolecciones y que NO se desee consulta en collectionGroup
        limit = this.defaultPageLimit,
        startDoc: any = null
    ): IControl$<emb_SubColeccion, Iemb_SubColeccion<IQValue_emb_SubColeccion>> {
        
        //================================================================
        //configurar QValue por default si se requiere:
        if (!QValue || QValue == null) {
            QValue = <Iemb_SubColeccion<IQValue_emb_SubColeccion>>{_id:{_orden:"asc"}};            
        }

        //configurar tipo de paginacion deseada:
        const typePaginate:number =  ETypePaginate.Full;

        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            
            //================================================================
            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef = cursorQueryRef.orderBy(this.Model_Meta._id.nom, QValue._id._orden || "asc") 
            cursorQueryRef = cursorQueryRef.limit(limit);    
            if (typePaginate == ETypePaginate.Single || typePaginate == ETypePaginate.Full) {
                cursorQueryRef = cursorQueryRef.startAfter(startDoc || null);                    
            }           
            //================================================================
            return cursorQueryRef;
        };
       
        //================================================================
        //objeto para parametro:
        const QFilter = {query, QValue, v_PreGet, startDoc, limit, typePaginate};
        return this.readControl$(control$, QFilter, path_EmbBase);

    }

    /*geId$()*/
    //permite obtener un doc por medio de un id SIN  path_id, es un metodo auxiliar
    //con el mismo funcionamiento de las demas lecturas (excepto la de
    // getModelo_Path_id$() ).
    //
    //Recordar:en lo posible usar getModelo_Path_id$() a no ser que no se 
    //cuente con el path_id, para ese caso es mejor este metodo
    //
    //Parametros:
    //doc$:
    //objeto control$ con toda la informacion de la lectura reactiva (aunque 
    //puede recibirse  null  si es la primera vez)
    //
    //RFS:
    //objeto con las funciones next() y error() para ejecutar una vez este suscrito
    //
    //QValue:
    //recibe un objeto creado a partir de la interfaz IModelo<IQValue_Modelo>
    //que a su vez contiene los valores necesarios para construir la query
    //(valores como:  buscar, rangos, iniciales, entre otros)
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //
    //path_EmbBase:
    //se debe recibir para determinar que tipo de query se procesara
    //si se envia el path personalizado se entenderá que es query de 
    //subColeccion basica pero si se recibe null se entendera que es
    //query de tipo colletcionGroup()
    //    
    //No requiere ni limite ni docInicial ya que se sobreentiende que devuelve solo 1 doc    
    public getId$(
        control$: IControl$<emb_SubColeccion, Iemb_SubColeccion<IQValue_emb_SubColeccion>>,
        QValue: Iemb_SubColeccion<IQValue_emb_SubColeccion>,
        v_PreGet:Iv_PreGet_emb_SubColeccion | null,
        path_EmbBase:string = null, //Obligatorios para subcolecciones y que NO se desee consulta en collectionGroup
    ): IControl$<emb_SubColeccion, Iemb_SubColeccion<IQValue_emb_SubColeccion>> {

        //================================================================
        //configurar QValue por default si se requiere:
        if (!QValue || QValue == null) {
            QValue = <Iemb_SubColeccion<IQValue_emb_SubColeccion>>{_id:{_orden:"asc"}};            
        }

        //configurar tipo de paginacion deseada:
        const typePaginate:number =  ETypePaginate.No;

        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            //================================================================
            //Query Condiciones:
            cursorQueryRef = cursorQueryRef.where(this.Model_Meta._id.nom, "==", QValue._id.val);            
            //================================================================
            //no se requiere paginar       
            return cursorQueryRef;
        };
     
        //================================================================
        //objeto para parametro:
        const QFilter = {query, QValue, v_PreGet, startDoc:null, limit:0, typePaginate};
        return this.readControl$(control$, QFilter, path_EmbBase);
    }

    //--------------------------------------------------------------------------------------------------------------------------------

    //================================================================================================================================
    /*getBy_pathDoc$()*/
    //permite consultar un solo doc siempre y cuando se tenga el path_id
    //Parametros:
    //doc$:
    //objeto control$ con toda la informacion de la lectura reactiva (aunque 
    //puede recibirse  null  si es la primera vez)
    //
    //RFS:
    //objeto con las funciones next() y error() para ejecutar una vez este suscrito
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //
    //path_Id:
    //obligatorio, contiene el la RUTA CON ID del documento a leer, solo por 
    //primera vez se recibe un null y eso en casos que no se requiera 
    //inmediatamente obtener dicho doc
    //
    public getBy_pathDoc$(
        pathControl$: IpathControl$<emb_SubColeccion>,
        v_PreGet:Iv_PreGet_emb_SubColeccion | null,
        _pathDoc: string | null
    ): IpathControl$<emb_SubColeccion> {

        return this.readPathControl$(pathControl$, v_PreGet, this.preGetDocs, _pathDoc);
    }

    //================================================================================================================================
    /*paginate$()*/
    //este metodo determina y detecta el tipo de paginacion y solicita el
    //lote de documentos de acuerdo a los parametros
    //Parametros:
    //doc$:
    //objeto control$ con toda la informacion de la lectura reactiva 
    //(aqui NO PUEDE RECIBIRSE NULL)
    //
    //direccionPaginacion:
    //se debe recibir alguna de las 2 opciones "previo" | "siguiente"
    //Recordar que no todos los tipos de paginacion aceptan "previo"
    //
    public paginate$(
        control$:IControl$<emb_SubColeccion, Iemb_SubColeccion<IQValue_emb_SubColeccion>>, 
        pageDirection: "previousPage" | "nextPage"
    ):IControl$<emb_SubColeccion, Iemb_SubColeccion<IQValue_emb_SubColeccion>> {

        return this.paginteControl$(control$, pageDirection);
    }

    //================================================================================================================================    
    /*create*/
    //permite la creacion de un doc en tipo set
    //Parametros:
    //
    //newDoc:
    //el doc a crear
    //
    //path_EmbBase:
    //OBLIGATORIO para las subcolecciones
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public create(newDoc: emb_SubColeccion, path_EmbBase:string, v_PreMod?:Iv_PreMod_emb_SubColeccion): Promise<void> {

        //================================================================
        //pre modificacion y formateo del doc
        newDoc = this.preModDoc(newDoc, true, false, v_PreMod, path_EmbBase);
        //================================================================
        return new Promise<void>((resolve, reject) =>{
            this.createDocFS(newDoc, this.getPathCollection(path_EmbBase))
            .then(()=>{
                //aqui todo lo de despues de la creacion

                resolve();
            })
            .catch((err)=>{
                console.log(err);
                reject();
            });
        });
    }

    //================================================================
    /*update*/
    //permite la modificacion de un doc por medio de su _id
    //
    //Parametros:
    //
    //updatedDoc:
    //el doc a editar
    //
    //path_EmbBase:
    //OBLIGATORIO para las subcolecciones
    //
    //isStrongUpdate:
    //determina si se REEMPLAZAN los campos map_ y mapA_
    //o no se modifican
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public update(updatedDoc: emb_SubColeccion, path_EmbBase:string, isStrongUpdate = false, v_PreMod?:Iv_PreMod_emb_SubColeccion): Promise<void> {

        //================================================================
        //pre modificacion y formateo del doc
        updatedDoc = this.preModDoc(updatedDoc, false, isStrongUpdate, v_PreMod, path_EmbBase);
        //================================================================
        return new Promise<void>((resolve, reject) =>{
            this.updateDocFS(updatedDoc, this.getPathCollection(path_EmbBase))
            .then(()=>{
                //aqui todo lo de despues de la actualizacion

                resolve();
            })
            .catch((err)=>{
                console.log(err);
                reject();
            });
        });

    }
    //================================================================
    /*delete */
    //permite la eliminacion de un doc por medio del _id
    //Parametros:
    //
    //_id:
    //estring con id a eliminar
    //
    //path_EmbBase:
    //OBLIGATORIO para las subcolecciones
    // 
    public delete(_id: string, path_EmbBase:string): Promise<void> {

        return new Promise<void>((resolve, reject) =>{
            this.deleteDocFS(_id, this.getPathCollection(path_EmbBase))
            .then(()=>{
                //aqui todo lo de despues de la eliminacion

                resolve();
            })
            .catch((err)=>{
                console.log(err);
                reject();
            });
        });
    }

    //================================================================================================================================
    /*createControl$()*/
    public createControl$(
        RFS:IRunFunSuscribe<emb_SubColeccion>
    ):IControl$<emb_SubColeccion, Iemb_SubColeccion<IQValue_emb_SubColeccion>>{
        let control$ = this.createPartialControl$(RFS, this.preGetDocs);

        //================================================================
        //Configurar controls$ extrenos de apoyo para este control$
        
        //================================================================

        return control$;
    }
    /*createPathControl$()*/
    public createPathControl$(
        RFS:IRunFunSuscribe<emb_SubColeccion>
    ):IpathControl$<emb_SubColeccion>{
        let control$ = this.createPartialPathControl$(RFS, this.preGetDocs);

        //================================================================
        //Configurar controls$ extrenos de apoyo para este control$
        
        //================================================================

        return control$;
    }
    //================================================================
    /*preModDoc()*/
    //metodo que debe ejecutarse antes de crear o actualizar un documento
    //Parametros:
    //doc
    //el documento que se desea crear o actualizar
    //
    //isCreate:
    //determina si se desea crear o actualizar
    //
    //isStrongUpdate:
    //cuando se edita un documento se determina su los campos especiales como
    // map_  y  mapA_  se deben reemplazar completamente
    //
    //v_PreMod: 
    //objeto que contiene datos para enriqueser o realizar operaciones
    //de acuerdo a la coleccion (determinar si se crea o se actualiza, 
    //generar _ids y )
    //
    //path_EmbBase:
    //es exclusivo y OBLIGATORIO para subcolecciones, se recibe el pathBase 
    //para poder modificar el documento de la subcoleccion
    //    


    private preModDoc(
        doc:emb_SubColeccion, 
        isCreate:boolean=true,
        isStrongUpdate=false, 
        v_PreMod?:Iv_PreMod_emb_SubColeccion,
        path_EmbBase?:string,
    ):emb_SubColeccion{

        //================================================================
        //se determina si se desea crear el documento para su configuracion
        if (isCreate) {
            //================================================================
            //se determina si se genera un _id personalizado o si el objeto ya
            //trae consigo un _id de una fuente externa
            doc._id = (doc._id && typeof doc._id === 'string' && doc._id != "") ?
                doc._id :
                this.createIds();          

            //aqui se genera el   _pathDoc   del doc a crear
            doc._pathDoc = this.create_pathDoc(doc._id, path_EmbBase);
            //================================================================
        }
        
        if (v_PreMod) {
            //...aqui toda la modificacion y formateo especial previo a guardar
        }
        //================================================================
        //aqui se formatean los datos del documento (se quitan campos 
        //inecesarios (no almacenables))
        doc = this.formatearDoc(doc, this.Model_Meta, isStrongUpdate);
        //================================================================                               
        return doc;       
    }

    //================================================================
    /*preGetDocs()*/
    //Funcion que debe ejecutarse antes de entregar CADA DOCUMENTO LEIDO 
    //(documento por documento) en el pipe del observable de lectura
    //
    //IMPORTANTE: este metodo se usa tambien como variable-funcion
    //para ser pasado a la clase padre como parametro
    //
    //Parametros:
    //docs ->  documento o documentos que se leyeron de firebase
    //v_PreLeer-> objeto que contiene datos para enriqueser o realizar operaciones
    //          (por ejemplo cargar los campos virtuales) antes de entregar a
    //          la vista o componente correspondiente

    private preGetDocs(
        doc:emb_SubColeccion, 
        v_PreGet?:Iv_PreGet_emb_SubColeccion
    ):emb_SubColeccion{

        if(v_PreGet && v_PreGet != null){
            //================================================================
            //aqui todo lo referente a la modificacion de cada documento antes 
            //de devolverlo
            
            //================================================================
        }
        //retornar doc ya customizado y enriquecido
        return doc;
    }
    //================================================================
    /*createDocsTest()*/  
    // permite crear hasta 10 documentos para hacer pruebas
    private createDocsTest(isActived:boolean=false){
        if(isActived){

        }
    }      
}
//================================================================================================================================




