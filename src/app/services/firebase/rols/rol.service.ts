//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, observable, Subject, BehaviorSubject, } from 'rxjs';
import { map, switchMap, } from 'rxjs/operators';

import { IRol, Rol } from '../../../models/firebase/rols/rol';
import { RolCtrl_Util, Iv_PreLeer_Rol, Iv_PreModificar_Rol, IValQ_Rol } from './rolCtrl_Util';
import { Service_Util, EtipoPaginar, IQFiltro,IDoc$, IpathDoc$, IRunFunSuscribe } from '../_Util';

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

export class RolService extends Service_Util< Rol, IRol<any>,  RolCtrl_Util, IRol<IValQ_Rol>> {

    //================================================================
    //Propiedaes utilitarias
    
    //almacena el path correspondiente a este coleccion o subcoleccion
    private _pathColeccion: string;

    //almacena un limite de docs leidos estandar para TODAS LAS QUERYS,
    //sin embargo se puede cambiar este numero en la propiedad QFiltro.limite
    private limitePaginaPredefinido: number;

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
        this.ModeloCtrl_Util = new RolCtrl_Util();

        //establece un limite predefinido (es personalizable)
        this.limitePaginaPredefinido = 4;//10;

        //================================================================
        //Configuracion de pathColeccion
        //para las colecciones SIEMPRE se usa el path coleccion generado 
        //desde la clase ctrl_Util
        //
        this._pathColeccion = this.ModeloCtrl_Util.getPathColeccion();
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
    //valQuery:
    //recibe un objeto creado a partir de la interfaz IModelo<IvalQ_Modelo>
    //que a su vez contiene los valores necesarios para construir la query
    //(valores a buscar, rangos, iniciales, entre otros)
    //
    //limite:
    //indica el numero maximo de docs que puede leer en la query, si no se
    //recibe se le asigna el limite predefinido para todas las querys
    //
    //docInicial:
    //solo es necesario recibirlo si por alguna razon se quiere paginar 
    //No teniendo como base los snapshotsDocs sino otra cosa
    public get$(doc$:IDoc$<Rol, IRol<IValQ_Rol>> | null, 
                        RFS:IRunFunSuscribe<Rol>, 
                        valQuery:IRol<IValQ_Rol> | null, 
                        limite=this.limitePaginaPredefinido, 
                        docInicial:any=null, 
                        ):IDoc$<Rol, IRol<IValQ_Rol>>{
        
        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this._pathColeccion; 
        const isColeccionGrup = false;       
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                      QFiltro: IQFiltro<IRol<IValQ_Rol>>) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            
            //================================================================
            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef = cursorQueryRef.orderBy(this.ModeloCtrl_Util._id.nom, QFiltro.valQuery._id._orden || "asc") 
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
        const QFiltro:IQFiltro<IRol<IValQ_Rol>> = {
            query : query,
            docInicial : docInicial,
            limite: limite,
            tipoPaginar : EtipoPaginar.Full,
            valQuery : (valQuery && valQuery != null)? valQuery : <IRol<IValQ_Rol>>{_id:{_orden:"asc"}}
        }
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, pathColeccion, isColeccionGrup);
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
    //valQuery:
    //recibe un objeto creado a partir de la interfaz IModelo<IvalQ_Modelo>
    //que a su vez contiene los valores necesarios para construir la query
    //(valores a buscar, rangos, iniciales, entre otros)
    //
    //No requiere ni limite ni docInicial ya que se sobreentiende que devuelve solo 1 doc
    public getId$(doc$:IDoc$<Rol, IRol<IValQ_Rol>> | null, 
                          RFS:IRunFunSuscribe<Rol>, 
                          valQuery:IRol<IValQ_Rol> | null
                          ):IDoc$<Rol, IRol<IValQ_Rol>>{

        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this._pathColeccion; 
        const isColeccionGrup = false;    
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                     QFiltro: IQFiltro<IRol<IValQ_Rol>>) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            //================================================================
            //Query Condiciones:
            cursorQueryRef = cursorQueryRef.where(this.ModeloCtrl_Util._id.nom, "==", QFiltro.valQuery._id.val);            
            //================================================================
            //no se requiere paginar            
            return cursorQueryRef;
        };
        //================================================================
        //Configurar el filtro con las propiedades adicionales como:
        //el pathColeccion, el tipoPaginar, docInical para la lectura paginada
        //el orden y demas propiedades
        const QFiltro:IQFiltro<IRol<IValQ_Rol>> = {
            query : query,
            docInicial : null,
            limite: 1,
            tipoPaginar : EtipoPaginar.No,
            valQuery : (valQuery && valQuery != null)? valQuery : <IRol<IValQ_Rol>>{_id:{_orden:"asc"}}
        }        
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, pathColeccion, isColeccionGrup);
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
    //path_Id:
    //obligatorio, contiene el la RUTA CON ID del documento a leer, solo por 
    //primera vez se recibe un null y eso en casos que no se requiera 
    //inmediatamente obtener dicho doc
    //
    public get_pathDoc$(pathDoc$:IpathDoc$<Rol>, 
                                RFS:IRunFunSuscribe<Rol>, 
                                _pathDoc:string | null 
                                ):IpathDoc$<Rol>{

        return this.leer_pathDoc$(pathDoc$, RFS, _pathDoc);
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
    public paginar$(doc$:IDoc$<Rol, IRol<IValQ_Rol>>, 
                            direccionPaginacion: "previo" | "siguiente"
                            ):IDoc$<Rol, IRol<IValQ_Rol>> {

        return this.paginarDocs(doc$, direccionPaginacion);
    }

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
    public crear(docNuevo: Rol, v_PreMod?:Iv_PreModificar_Rol): Promise<void> {

        //================================================================
        //pre modificacion y formateo del doc
        docNuevo = this.ModeloCtrl_Util.preCrearOActualizar(docNuevo,true, false, v_PreMod);
        //================================================================
        return this.crearDoc(docNuevo, this.ModeloCtrl_Util.getPathColeccion());
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
    public actualizar(docEditado: Rol, isEditadoFuerte = false, v_PreMod?:Iv_PreModificar_Rol): Promise<void> {
        //TEST--------------------------------------------
        docEditado = <Rol>{
            _id: "",
            codigo:""
        }
        //------------------------------------------------
        //================================================================
        //pre modificacion y formateo del doc
        docEditado = this.ModeloCtrl_Util.preCrearOActualizar(docEditado, false, isEditadoFuerte, v_PreMod);
        //================================================================
        return this.actualizarDoc(docEditado, this.ModeloCtrl_Util.getPathColeccion());

    }
    //================================================================
    /*eliminar */
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
        return this.eliminarDoc(_id, this.ModeloCtrl_Util.getPathColeccion());
    }

    //================================================================

}
//================================================================================================================================



