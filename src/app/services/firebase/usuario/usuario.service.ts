//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, observable, Subject, BehaviorSubject, } from 'rxjs';
import { map, switchMap, } from 'rxjs/operators';

import { IUsuario, Usuario } from '../../../models/firebase/usuario/usuario';
import { UsuarioCtrl_Util } from './usuario_Meta';
import { Service_Util, EtipoPaginar, IQFiltro,IDoc$, IpathDoc$, IRunFunSuscribe, IQValue } from '../service_Util';

//================================================================================================================================
/*INTERFACES y ENUMs especiales para cada modelo de service*/
//Interfaces especiales para implementar contenedores de 
//objetos utilitarios para los metodos Pre  
//deben llevar el sufijo   _Modelo   del moedelo para no generar 
//conflictos con otras colecciones cuando se haga   import
//Ejemplo: Iv_PreLeer{aqui el sufijo de coleccion o subcoleccion}

/*Iv_PreGet_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades externar al modelo (mas especificamente IModelo)
//para realizar calculos o enriquecer los docs leidos
//se recomienda crear objetos de esta interfaz en la 
//propiedad-funcion next de los objetos RFS
export interface Iv_PreGet_Usuario{

}

/*Iv_PreMod_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades externar al modelo (mas especificamente IModelo) 
//para realizar calculos o enriquecer el doc a modificar (ya sea crear o editar) 
export interface Iv_PreMod_Usuario{

}

/*IQValue_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades personalizadas para este modelo_util para 
//construir querys personalizadas y especificas
export interface IQValue_Usuario extends IQValue{

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

export class UsuarioService extends Service_Util< Usuario, IUsuario<any>,  UsuarioCtrl_Util, IUsuario<IQValue_Usuario>> {

    //================================================================
    //Propiedaes utilitarias

    //================================================================
    constructor(private _afs: AngularFirestore) {
        super();
        //================================================================
        //cargar la configuracion de la coleccion:

        //indispensable dejar una referencia de_afs en la clase padre
        //IMPORTANTE: los servicios (como AngularFirestore) no se pueden 
        //inyectar directamente en la clase padre por problemas con super()
        super.U_afs = this._afs;
        
        //Objeto con metodos y propiedeades de utilidad para el service
        this.Modelo_Meta = new UsuarioCtrl_Util();

        //establece un limite predefinido para este 
        //service (es personalizable incluso se puede 
        //omitir y dejar el de la clase padre)
        //this.limitePaginaPredefinido = 10;
        //================================================================
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
    /*Metodos CRUD SOLO COLECCIONES:*/
    //Observaciones:
    //al utilizar lecturas reactivas los metodos leer de CRUD varian
    //su comportamiento ya que difieren de la metodologia MVC tradicional
    //por lo tanto los filtros y construccion de querys son pasadas como 
    //propiedades al behavior determinado 
    //
    //Para el caso de las colecciones los metodos de lectura NO REQUIEREN
    //EL RECIBIR un pathColeccion ya que al ser colecciones RAIZ siempre 
    //su path sera con el formato: /{coleccion}
    //
    //Los metodos de lectura NO DEVUELVEN LOS DOCS LEIDOS, devuelven un 
    //objeto control$ de tipo IDoc$<TModelo, TIModelo_IvalQ> que contiene 
    //TODO lo referente a la lectura reactiva (behaviors, observables, 
    //suscriptions, limites, tipo de paginacion filtros querys y demas) 
    //dentro de este control$ se almacena un RFS que contiene las 
    //funciones que se ejecutan una vez obtenidos los docs
    //es la razon de que todas lso metodos de lectura tengan la terminacion  $
    //================================================================
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
    //limite:
    //indica el numero maximo de docs que puede leer en la query, si no se
    //recibe se le asigna el limite predefinido para todas las querys
    //
    //docInicial:
    //solo es necesario recibirlo si por alguna razon se quiere paginar 
    //No teniendo como base los snapshotsDocs sino otra cosa
    public get$(
        doc$:IDoc$<Usuario, IUsuario<IQValue_Usuario>> | null, 
        RFS:IRunFunSuscribe<Usuario>, 
        QValue:IUsuario<IQValue_Usuario> | null, 
        v_PreGet:Iv_PreGet_Usuario | null,
        limite=this.limitePaginaPredefinido, 
        docInicial:any=null, 
    ):IDoc$<Usuario, IUsuario<IQValue_Usuario>>{
        
        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this.getPathColeccion(); 
        const isColeccionGrup = false;       
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                      QFiltro: IQFiltro<IUsuario<IQValue_Usuario>>) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            
            //================================================================
            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef = cursorQueryRef.orderBy(this.Modelo_Meta._id.nom, QFiltro.QValue._id._orden || "asc") 
            cursorQueryRef = cursorQueryRef.limit(QFiltro.limite || this.limitePaginaPredefinido);
            if (QFiltro.tipoPaginar == EtipoPaginar.Simple || QFiltro.tipoPaginar == EtipoPaginar.Full) {
                cursorQueryRef = cursorQueryRef.startAfter(QFiltro.docInicial || null);                    
            }            
            //================================================================

            return cursorQueryRef;
        };
        //================================================================
        //Configurar el filtro con las propiedades adicionales como:
        //el pathColeccion, el tipoPaginar, docInical para la lectura paginada
        //el orden y demas propiedades
        const QFiltro:IQFiltro<IUsuario<IQValue_Usuario>> = {
            query : query,
            docInicial : docInicial,
            limite: limite,
            tipoPaginar : EtipoPaginar.Full,
            QValue : (QValue && QValue != null)? QValue : <IUsuario<IQValue_Usuario>>{_id:{_orden:"asc"}},
            v_PreGet: v_PreGet
        }
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, this.preGetDocs, pathColeccion, isColeccionGrup);
    }

    /*getId$()*/
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
    //No requiere ni limite ni docInicial ya que se sobreentiende que devuelve solo 1 doc
    public getId$(
        doc$: IDoc$<Usuario, IUsuario<IQValue_Usuario>> | null,
        RFS: IRunFunSuscribe<Usuario>,
        QValue: IUsuario<IQValue_Usuario> | null,
        v_PreGet:Iv_PreGet_Usuario | null
    ): IDoc$<Usuario, IUsuario<IQValue_Usuario>> {

        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this.getPathColeccion(); 
        const isColeccionGrup = false;    
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                     QFiltro: IQFiltro<IUsuario<IQValue_Usuario>>) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            //================================================================
            //Query Condiciones:
            cursorQueryRef = cursorQueryRef.where(this.Modelo_Meta._id.nom, "==", QFiltro.QValue._id.val);            
            //================================================================
            //no se requiere paginar            
            return cursorQueryRef;
        };
        //================================================================
        //Configurar el filtro con las propiedades adicionales como:
        //el pathColeccion, el tipoPaginar, docInical para la lectura paginada
        //el orden y demas propiedades
        const QFiltro:IQFiltro<IUsuario<IQValue_Usuario>> = {
            query : query,
            docInicial : null,
            limite: 1,
            tipoPaginar : EtipoPaginar.No,
            QValue : (QValue && QValue != null)? QValue : <IUsuario<IQValue_Usuario>>{_id:{_orden:"asc"}},
            v_PreGet:v_PreGet
        }        
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, this.preGetDocs, pathColeccion, isColeccionGrup);
    }

    //TEST---------------------------------------------------------------------------------------------------------------------------
    public getPorNombre$(
        doc$: IDoc$<Usuario, IUsuario<IQValue_Usuario>> | null,
        RFS: IRunFunSuscribe<Usuario>,
        QValue: IUsuario<IQValue_Usuario>,
        v_PreGet:Iv_PreGet_Usuario | null,
        limite = this.limitePaginaPredefinido,
        docInicial: any = null
    ): IDoc$<Usuario, IUsuario<IQValue_Usuario>> {
        
        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this.getPathColeccion(); 
        const isColeccionGrup = false;       
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                      QFiltro: IQFiltro<IUsuario<IQValue_Usuario>>) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;

            //================================================================
            //Query Condiciones:
            //
            //firestore no permite condiciones de busqueda avanzadas para strings 
            //asi que para suplir la consulta de textos que comiencen por algun texto
            //
            //se usa una consulta con 2 keys limitadoras y se obtiene todos los documentos 
            //que esten dentro de ese rango
            //
            if (QFiltro.QValue && QFiltro.QValue.nombre) {
                let keyIni = QFiltro.QValue.nombre.ini.trim();
                //se calcula la keyFin que sera un caracter superior al keyIni
                let keyFin = this.getLlaveFinBusquedaStrFirestore(keyIni);
    
                //se establecen los rangos, entre mas texto tengan cada key mas precisa es la busqueda
                cursorQueryRef = cursorQueryRef.where(this.Modelo_Meta.nombre.nom, ">=", keyIni)
                                               .where(this.Modelo_Meta.nombre.nom, "<", keyFin);
            }
    
            //================================================================
            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef =  cursorQueryRef.orderBy(this.Modelo_Meta.nombre.nom, QFiltro.QValue.nombre._orden || "asc");
            cursorQueryRef = cursorQueryRef.limit(QFiltro.limite || this.limitePaginaPredefinido);      
            if (QFiltro.tipoPaginar == EtipoPaginar.Simple || QFiltro.tipoPaginar == EtipoPaginar.Full) {
                cursorQueryRef = cursorQueryRef.startAfter(QFiltro.docInicial || null);                    
            }    
            //================================================================
    
            return cursorQueryRef;
        };
        //================================================================
        //Configurar el filtro con las propiedades adicionales como:
        //el pathColeccion, el tipoPaginar, docInical para la lectura paginada
        //el orden y demas propiedades
        const QFiltro:IQFiltro<IUsuario<IQValue_Usuario>> = {
            query : query,
            docInicial : docInicial,
            limite: limite,
            tipoPaginar : EtipoPaginar.Simple,
            QValue : (QValue && QValue != null)? QValue : <IUsuario<IQValue_Usuario>>{nombre:{_orden:"asc"}},
            v_PreGet:v_PreGet
        }        
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, this.preGetDocs, pathColeccion, isColeccionGrup);
    }

    //================================================================================================================================
    /*get_Path_Id$*/
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
    public get_pathDoc$(
        pathDoc$: IpathDoc$<Usuario>,
        RFS: IRunFunSuscribe<Usuario>,        
        v_PreGet:Iv_PreGet_Usuario | null,
        _pathDoc: string | null
    ): IpathDoc$<Usuario> {

        return this.leer_pathDoc$(pathDoc$, RFS, v_PreGet, this.preGetDocs, _pathDoc);
    }

    //================================================================================================================================
    /*paginar*/
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
    public paginar$(
        doc$: IDoc$<Usuario, IUsuario<IQValue_Usuario>>,
        direccionPaginacion: "previo" | "siguiente"
    ): IDoc$<Usuario, IUsuario<IQValue_Usuario>> {

        return this.paginarDocs(doc$, direccionPaginacion);
    }

    //================================================================================================================================

    //TEST----------------------------------------------
    public pruebaIndexCrear = 0;
    //--------------------------------------------------    

    //================================================================================================================================    
    /*crear*/
    //permite la creacion de un doc en tipo set
    //Parametros:
    //
    //docNuevo:
    //el doc a crear
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public crear(docNuevo: Usuario, v_PreMod?:Iv_PreMod_Usuario): Promise<void> {

        //TEST----------------------------------------------
        let loteNuevos = <Usuario[]>[
            {
                _id: "",
                _pathDoc:"",
                nombre: "ADA",
                apellido:"WONG",
                edad:"23"
            },
            {
                _id: "",
                _pathDoc:"",
                nombre: "JHON",
                apellido:"CONNOR",
                edad:"42"
            }
        ];

        if (this.pruebaIndexCrear < loteNuevos.length) {
            docNuevo = loteNuevos[this.pruebaIndexCrear];
            this.pruebaIndexCrear++;
        } else {
            throw "eeee";
        }
        //--------------------------------------------------
        //================================================================
        //pre modificacion y formateo del doc
        docNuevo = this.preModDoc(docNuevo,true, false, v_PreMod);
        //================================================================
        return this.crearDoc(docNuevo, this.getPathColeccion());
    }

    //================================================================
    /*actualizar*/
    //permite la modificacion de un doc por medio de su _id
    //
    //Parametros:
    //
    //docEditado:
    //el doc a editar
    //
    //isEditadoFuerte:
    //determina si se REEMPLAZAN los campos map_ y mapA_
    //o no se modifican
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public actualizar(docEditado: Usuario, isEditadoFuerte = false, v_PreMod?:Iv_PreMod_Usuario): Promise<void> {
        //TEST--------------------------------------------
        docEditado = <Usuario>{
            _id: "1-9c73bc52fc92837d",
            nombre:"de"
        }
        //------------------------------------------------
        //================================================================
        //pre modificacion y formateo del doc
        docEditado = this.preModDoc(docEditado, false, isEditadoFuerte, v_PreMod);
        //================================================================
        return this.actualizarDoc(docEditado, this.getPathColeccion());

    }
    //================================================================
    /*eliminar*/
    //permite la eliminacion de un doc por medio del _id
    //Parametros:
    //
    //_id:
    //estring con id a eliminar
    //
    public eliminar(_id: string): Promise<void> {
        //Test-------------------------------------------
        _id = "2-a940c69dbf6536cc";
        //------------------------------------------------
        return this.eliminarDoc(_id, this.getPathColeccion());
    }

    //================================================================================================================================
    /*preModDoc()*/
    //metodo que debe ejecutarse antes de crear o actualizar un documento
    //Parametros:
    //doc
    //el documento que se desea crear o actualizar
    //
    //isCrear:
    //determina si se desea crear o actualizar
    //
    //isEditadoFuerte:
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
    //_idExterno:
    //si se requiere asignar un _id especial (No el personalizado) proveido por 
    //alguna api externa (por ejemplo en el caso de los _id de auth proveeidos 
    //por la api de registro de google)
    private preModDoc(
        doc: Usuario,
        isCrear: boolean = true,
        isEditadoFuerte = false,
        v_PreMod?: Iv_PreMod_Usuario,
        path_EmbBase?: string,
        _idExterno?: string
    ): Usuario {

        //================================================================
        //se determina si se desea crear el documento para su configuracion
        if (isCrear) {
            //================================================================
            //aqui se genera el nuevo _id a guardar
            doc._id = this.generarIds();
            //================================================================
            //aqui se genera el   _pathDoc   del doc a crear, en el caso
            // de las colecciones SIEMPRE será el pathColeccion estandar
            //IMPORTANTE: SOLO PARA COLECCIONES
            doc._pathDoc = `${this.getPathColeccion(path_EmbBase || "")}/${doc._id}`;
            //================================================================
        }
        //----------------[EN CONSTRUCCION]----------------
        if (v_PreMod) {

        }
        //------------------------------------------------
        //================================================================
        //aqui se formatean los datos del documento (se quitan campos 
        //inecesarios (no almacenables))
        doc = this.formatearDoc(doc, this.Modelo_Meta, isEditadoFuerte);
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
        doc:Usuario, 
        v_PreGet?: Iv_PreGet_Usuario
    ):Usuario {

        if(v_PreGet && v_PreGet != null){
            //================================================================
            //aqui todo lo referente a la modificacion de cada documento antes 
            //de devolverlo
            
            //================================================================
        }
        //retornar doc ya customizado y enriquecido
        return doc;
    }
}
//================================================================================================================================



