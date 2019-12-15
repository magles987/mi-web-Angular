//================================================================================================================================
//los servicios en angular implementas las funciones (en muchos casos las CRUD) de los datos recibidos 
// desde firebase, en otras palabras hace las veces de controller para angular

//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, observable, Subject, BehaviorSubject, } from 'rxjs';
import { map, switchMap, } from 'rxjs/operators';

import { Iemb_SubColeccion, emb_SubColeccion } from '../../../models/firebase/productos/emb_subColeccion';
import { Ctrl_Util, IUtilCampo, IValQ, Service_Util, EtipoPaginar, IQFiltro,IDoc$, IDocPath_Id$, IRunFunSuscribe } from '../_Util';

//================================================================
/*INTERFACES especiales para cado Modelo_util*/
//Interfaces especiales para implementar contenedores de 
//objetos utilitarios para los metodos Pre  
//deben llevar el sufijo   _Modelo   del moedelo para no generar 
//conflictos con otras colecciones cuando se haga   import
//Ejemplo: Iv_PreLeer{aqui el sufijo de coleccion o subcoleccion}

/*Iv_PreModificar_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades externar al modelo (mas especificamente IModelo)
//para realizar calculos o enriquecer los docs leidos
//se recomienda crear objetos de esta interfaz en la 
//propiedad-funcion next de los objetos RFS
export interface Iv_PreLeer_emb_SubColeccion{

}

/*Iv_PreModificar_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades externar al modelo (mas especificamente IModelo) 
//para realizar calculos o enriquecer el doc a modificar (ya sea crear o editar) 
export interface Iv_PreModificar_emb_SubColeccion {

}

/*IValQ_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades personalizadas para este modelo_util para 
//construir querys personalizadas y especificas
export interface IValQ_emb_SubColeccion extends IValQ{

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
export class emb_subColeccionService extends Service_Util<emb_SubColeccion, Iemb_SubColeccion<any>, emb_SubColeccionCtrl_Util, Iemb_SubColeccion<IValQ_emb_SubColeccion>> {

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
        //cargar la configuracion de la coleccion

        //indispensable dejar una referencia de_afs en la clase padre
        super.U_afs = this._afs;

        //Objeto con metodos y propiedeades de utilidad para el service
        this.ModeloCtrl_Util = new emb_SubColeccionCtrl_Util();

        //establece un limite predefinido (es personalizable)
        this.limitePaginaPredefinido = 10;

        //================================================================
        //Configuracion de pathColeccion
        //para las colecciones SIEMPRE se usa el path coleccion generado 
        //desde la clase ctrl_Util
        //
        this._pathColeccion = this.ModeloCtrl_Util.getPathColeccion();
        //================================================================
        //Inicializar el ultimoDoc$
        this.leerUltimoDoc(null, this._pathColeccion);
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
    /*get{Models}$()*/
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

    public getEmb_SubColeccions$(doc$:IDoc$<emb_SubColeccion, Iemb_SubColeccion<IValQ_emb_SubColeccion>> | null, 
                            RFS:IRunFunSuscribe<emb_SubColeccion>, 
                            valQuery:Iemb_SubColeccion<IValQ_emb_SubColeccion> | null,
                            path_EmbBase:string | null, //Obligatorio o enviar null
                            limite=this.limitePaginaPredefinido, 
                            docInicial:any=null
                            ):IDoc$<emb_SubColeccion, Iemb_SubColeccion<IValQ_emb_SubColeccion>>{
        
        //================================================
        //configurar el pathColeccion solo para subColeccion:
        //determinar cual de las 2 opciones de query se requiere
        //si la pathColeccion personalizado (la ideal)
        //o a traves del pathColeccion estandar de la subColeccion
        //entregado por la clase emb_Modelo_Util (cuando ya se 
        //tiene establecido la EXENCION para poder usar collectionGroup() 
        //(si no se tiene la EXENCION se dispara un error por parte 
        //de angularfire2))
        const pathColeccion = (path_EmbBase && path_EmbBase!=null) ? 
                              this.ModeloCtrl_Util.getPathColeccion(path_EmbBase) : 
                              this._pathColeccion;
        const isColeccionGrup = (path_EmbBase && path_EmbBase!=null) ? 
                                false : 
                                true;
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                      QFiltro: IQFiltro<Iemb_SubColeccion<IValQ_emb_SubColeccion>>) => {

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
        const QFiltro:IQFiltro<Iemb_SubColeccion<IValQ_emb_SubColeccion>> = {
            query : query,
            docInicial : docInicial,
            limite: limite,
            tipoPaginar : EtipoPaginar.Full,
            valQuery : (valQuery && valQuery != null)? valQuery : <Iemb_SubColeccion<IValQ_emb_SubColeccion>>{_id:{_orden:"asc"}}
        }        
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, pathColeccion, isColeccionGrup);
    }

    /*get{Model}Id$()*/
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
    //path_EmbBase:
    //se debe recibir para determinar que tipo de query se procesara
    //si se envia el path personalizado se entenderá que es query de 
    //subColeccion basica pero si se recibe null se entendera que es
    //query de tipo colletcionGroup()
    //    
    //No requiere ni limite ni docInicial ya que se sobreentiende que devuelve solo 1 doc    
    public getEmb_SubColeccionsId$(doc$:IDoc$<emb_SubColeccion, Iemb_SubColeccion<IValQ_emb_SubColeccion>> | null, 
                              RFS:IRunFunSuscribe<emb_SubColeccion>, 
                              valQuery:Iemb_SubColeccion<IValQ_emb_SubColeccion>,
                              path_EmbBase:string | null, //Obligatorio o enviar null
                              ):IDoc$<emb_SubColeccion, Iemb_SubColeccion<IValQ_emb_SubColeccion>>{

        //================================================
        //configurar el pathColeccion solo para subColeccion:
        //determinar cual de las 2 opciones de query se requiere
        //si la pathColeccion personalizado (la ideal)
        //o a traves del pathColeccion estandar de la subColeccion
        //entregado por la clase emb_Modelo_Util (cuando ya se 
        //tiene establecido la EXENCION para poder usar collectionGroup() 
        //(si no se tiene la EXENCION se dispara un error por parte 
        //de angularfire2))
        const pathColeccion = (path_EmbBase && path_EmbBase!=null) ? 
                              this.ModeloCtrl_Util.getPathColeccion(path_EmbBase) : 
                              this._pathColeccion;
        const isColeccionGrup = (path_EmbBase && path_EmbBase!=null) ? 
                                false : 
                                true;
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, QFiltro: IQFiltro<Iemb_SubColeccion<IValQ_emb_SubColeccion>>) => {

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
        const QFiltro:IQFiltro<Iemb_SubColeccion<IValQ_emb_SubColeccion>> = {
            query : query,
            docInicial : null,
            limite: 1,
            tipoPaginar : EtipoPaginar.No,
            valQuery : (valQuery && valQuery != null)? valQuery : <Iemb_SubColeccion<IValQ_emb_SubColeccion>>{_id:{_orden:"asc"}}
        }        
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, pathColeccion, isColeccionGrup);
    }

    //--------------------------------------------------------------------------------------------------------------------------------

    //================================================================================================================================
    /*get{Modelo}_Path_Id$*/
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
    public getEmb_SubColeccion_Path_Id$(docPath_Id$:IDocPath_Id$<emb_SubColeccion>, 
                                    RFS:IRunFunSuscribe<emb_SubColeccion>, 
                                    path_Id:string | null 
                                    ):IDocPath_Id$<emb_SubColeccion>{

        return this.leerDocPath_Id$(docPath_Id$, RFS, path_Id);
    }

    //================================================================================================================================
    /*paginarDocs*/
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
    public paginarEmb_SubColeccions$(doc$:IDoc$<emb_SubColeccion, Iemb_SubColeccion<IValQ_emb_SubColeccion>>, 
                                direccionPaginacion: "previo" | "siguiente"
                                ):IDoc$<emb_SubColeccion, Iemb_SubColeccion<IValQ_emb_SubColeccion>> {

        return this.paginarDocs(doc$, direccionPaginacion);
    }
    //================================================================================================================================

    //TEST----------------------------------------------
    public pruebaIndexCrear = 0;
    //--------------------------------------------------    

    //================================================================================================================================    
    /*crear{modelo}*/    
    //permite la creacion de un doc en tipo set
    //Parametros:
    //
    //docNuevo:
    //el doc a crear
    //
    //path_EmbBase:
    //OBLIGATORIO para las subcolecciones
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public crearEmb_SubColeccion(docNuevo: emb_SubColeccion, path_EmbBase:string, v_PreMod?:Iv_PreModificar_emb_SubColeccion): Promise<void> {

        //-TEST----------------------------------------------
        let numId = this.ModeloCtrl_Util.getNumOrderKey(this.ultimoID);
        let loteNuevos = <emb_SubColeccion[]>[
            {
                _id: "",
                subCampo1:"c10-1-1",
                subCampo2:"c10-2-1"
            },
            {
                _id: "",
                subCampo1:"c10-1-2",
                subCampo2:"c10-2-2"
            },
            {
                _id: "",
                subCampo1:"c10-1-3",
                subCampo2:"c10-2-3"
            },
            {
                _id: "",
                subCampo1:"c10-1-4",
                subCampo2:"c10-2-4"
            },
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
        docNuevo = this.ModeloCtrl_Util.preCrearOActualizar(docNuevo, this.ultimoID, path_EmbBase, true, false, v_PreMod);
        //================================================================
        //realizar y retornar la creacion (se debe enviar el pathColeccion 
        //generado por el metodo generado):
        return this.crearDoc(docNuevo, this.ModeloCtrl_Util.getPathColeccion(path_EmbBase));
    }

    //================================================================
    /*actualizar{modelo}*/
    //permite la modificacion de un doc por medio de su _id
    //
    //Parametros:
    //
    //docEditado:
    //el doc a editar
    //
    //path_EmbBase:
    //OBLIGATORIO para las subcolecciones
    //
    //isEditadoFuerte:
    //determina si se REEMPLAZAN los campos map_ y mapA_
    //o no se modifican
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public actualizarEmb_SubColeccion(docEditado: emb_SubColeccion, path_EmbBase:string, isEditadoFuerte = false, v_PreMod?:Iv_PreModificar_emb_SubColeccion): Promise<void> {
        //TEST--------------------------------------------
        docEditado = <emb_SubColeccion>{
            _id: "1-9c73bc52fc92837d",
            subCampo1:"alfa",
            subCampo2:"beta"
        }
        //------------------------------------------------
        //================================================================
        //pre modificacion y formateo del doc
        docEditado = this.ModeloCtrl_Util.preCrearOActualizar(docEditado, this.ultimoID, path_EmbBase, false, isEditadoFuerte, v_PreMod);
        //================================================================
        return this.actualizarDoc(docEditado, this.ModeloCtrl_Util.getPathColeccion(path_EmbBase));

    }
    //================================================================
    /*eliminar {modelo}*/
    //permite la eliminacion de un doc por medio del _id
    //Parametros:
    //
    //_id:
    //estring con id a eliminar
    //
    //path_EmbBase:
    //OBLIGATORIO para las subcolecciones
    // 
    public eliminarProducto(_id: string, path_EmbBase:string): Promise<void> {
        //Test-------------------------------------------
        _id = "2-a940c69dbf6536cc";
        //------------------------------------------------
        //================================================================
        return this.eliminarDoc(_id, this.ModeloCtrl_Util.getPathColeccion(path_EmbBase));
    }

    //================================================================================================================================
    //desuscribir observables pricipales
    public unsubscribeAllProductos$(docs$:IDoc$<emb_SubColeccion, Iemb_SubColeccion<IValQ_emb_SubColeccion>>[], docPath_Id$:IDocPath_Id$<emb_SubColeccion>) {
        
        //================================================
        //agrego el control doc$ que hace referencia 
        //al control interno del ultimoDoc
        docs$.push(this.ultimoDoc$);
    
        //================================================
        //se desuscriben y eliminan TODOS los controles$ que 
        //hacen referencia a este controlador    
        for (let i = 0; i < docs$.length; i++) {
            docs$[i] = this.unsubscribeDoc$(docs$[i]);          
            
        }
        //tambien el control especial
        docPath_Id$ = this.unsubscribeDocsPath_Id$(docPath_Id$)   
        //================================================
    }
    //================================================================================================================================
}

//================================================================
/*{Modelo}Ctrl_Util*/
//las clases que heredan  Ctrl_Util y que implementa la interfaz 
//IModelo proporcionan funciones y utilidades enfocadas al manejo 
//de los controllers o services de cada modelo, entre sus funcionalidades
//estan: validaciones,formateo, nom, selecciones entre otros y se enfoca 
//en atomizar dichas funcionalidades para cada campo o en conjunto para 
//todo el modelo
//
//IMPORTANTE: en esta clase si se deberia agregar metodos y demas funcionalidades

export class emb_SubColeccionCtrl_Util extends Ctrl_Util<emb_SubColeccion, Iemb_SubColeccion<any>, emb_SubColeccionCtrl_Util>
                                       implements Iemb_SubColeccion<any> {

    //================================================================
    //atributos con funcionalidades para cada campo:
    _id:IUtilCampo<string, any> = {
        nom:"_id",
    };
    _pathDoc:IUtilCampo<string, any> = {
        nom:"_pathDoc",
    };

    subCampo1:IUtilCampo<string, any> = {
        nom : "subCampo1",
        isRequerido:true,
        formateoCampo:(val)=>{
            if (val && val != null) {
                const util = new emb_SubColeccionCtrl_Util();
                const c_util = util.subCampo1;
                val = val.trim();                
            }
            return val
        },
    };

    subCampo2:IUtilCampo<string, any> = {
        nom : "subCampo2",
        isRequerido:true,
        formateoCampo:(val)=>{
            if (val && val != null) {
                const util = new emb_SubColeccionCtrl_Util();
                const c_util = util.subCampo2;
                val = val.trim();                
            }
            return val
        },
    };    
 
    //================================================================

    constructor() {
        super();
    }
    //================================================================
    /*getNomColeccion()*/
    //obtener el nombre de la coleccion o subcoleccion SIN PATH
    public getNomColeccion():string{
        return "subColeccion";
    }    
    //================================================================
    /*getPathColeccion()*/
    //obtener el path de la coleccion o subcoleccion,
    //en las colecciones devuelve el mismo nom ya qeu son Raiz
    //Parametros:
    //
    //pathBase ->  path complemento para construir el el path completo
    //             util para las subcolecciones
    public getPathColeccion(pathBase:string=""):string{        
        if (pathBase == "") {
            return `${this.getNomColeccion()}`;
        }else{
            return `${pathBase}/${this.getNomColeccion()}`;
        }
    }    
    //================================================================
    /*preCrearOActualizar()*/
    //metodo que debe ejecutarse antes de crear o actualizar un documento
    //Parametros:
    //doc -> el documento que se desea crear o actualizar
    //v_utilesPreMod ->  objeto que contiene datos para enriqueser o realizar operaciones
    //                   de acuerdo a la coleccion (determinar si se crea o se actualiza, generar _ids y )

    public preCrearOActualizar(doc:emb_SubColeccion, 
                                ultimo_id:string,
                                path_EmbBase:string,
                                isCrear:boolean=true,
                                isEditadoFuerte=false, 
                                v_PreMod?:Iv_PreModificar_emb_SubColeccion
                               ):emb_SubColeccion{
        
        //================================================================
        //se determina si se desea crear el documento para su configuracion
        if (isCrear) {
            //================================================================
            //aqui se genera el nuevo _id a guardar
            doc._id = (ultimo_id && typeof ultimo_id === 'string') ?
                      this.generarIds(this.getNumOrderKey(ultimo_id)) : 
                      this.generarIds(0);                 
            //================================================================
            //aqui se genera el   _pathDoc   del doc a crear, en el caso
            // de las subColecciones SIEMPRE será requiere de un path_EmbBase
            //IMPORTANTE: SOLO PARA SUBCOLECCIONES
            doc._pathDoc = `${this.getPathColeccion(path_EmbBase)}/${doc._id}`;
            //================================================================
        }
        //----------------[EN CONSTRUCCION]----------------
        if (v_PreMod) {
            
        }
        //------------------------------------------------
        //================================================================
        //aqui se formatean los datos del documento (se quitan campos 
        //inecesarios (no almacenables))
        doc = this.formatearDoc(doc, this, isEditadoFuerte);
        //================================================================                               
        return doc;       
    }

    //================================================================
    /*preLeerDocs()*/
    //metodo que debe ejecutarse antes de entregar la lectura de documentos
    //al correspondiente componente, esta metodo se ejecuta en CADA 
    //DOCUMENTO LEIDO (documento por documento)
    //Parametros:
    //docs ->  documento o documentos que se leyeron de firebase
    //v_utilesPreLeer-> objeto que contiene datos para enriqueser o realizar operaciones
    //          (por ejemplo cargar los campos virtuales) antes de entregar a
    //          la vista o componente correspondiente
    public preLeerDocs(docs:emb_SubColeccion[] | emb_SubColeccion, v_utilesPreLeer:Iv_PreLeer_emb_SubColeccion):emb_SubColeccion[] | emb_SubColeccion{

        if(docs){
            if(Array.isArray(docs)){
                docs = docs.map((doc)=>{
                    //================================================================
                    //aqui todo lo referente a la modificacion de cada documento antes 
                    //de devolverlo
                    
                    //================================================================
                    return doc;
                });
            }else{
                //================================================================
                //aqui todo lo referente a la modificacion de cada documento antes 
                //de devolverlo
                
                //================================================================
            }
        }
        //retornar doc ya formateado
        return docs;
    }
}
//================================================================================================================================
/*Clases Ctrl_Util para campo especiales (map_ y mapA_)*/
//estas clases por ahora no necesitan extender a la clase _Util
//ya que no requieren metodos especiales, si se llegara a requerir
//(por ejemplo en las propiedades de validate o formato que son funciones
//se deberá usar declarar la clase util de la coleccion padre dentro de la 
//funcion y usar los metodos que se requieran)


//================================================================================================================================




