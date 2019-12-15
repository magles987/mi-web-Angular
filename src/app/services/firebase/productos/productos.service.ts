//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, observable, Subject, BehaviorSubject, } from 'rxjs';
import { map, switchMap, } from 'rxjs/operators';

import { IProducto, Producto, IMap_miscelanea, IMapA_misc } from '../../../models/firebase/productos/productos';
import { Ctrl_Util, IUtilCampo, IValQ, Service_Util, EtipoPaginar, IQFiltro,IDoc$, IDocPath_Id$, IRunFunSuscribe } from '../_Util';
import { emb_SubColeccionCtrl_Util } from './emb_subcoleccion.service';

//================================================================================================================================
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
export interface Iv_PreLeer_Producto{
    imp:number;  //--solo para ejemplo---
}

/*Iv_PreModificar_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades externar al modelo (mas especificamente IModelo) 
//para realizar calculos o enriquecer el doc a modificar (ya sea crear o editar) 
export interface Iv_PreModificar_Producto{

}

/*IValQ_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades personalizadas para este modelo_util para 
//construir querys personalizadas y especificas
export interface IValQ_Producto extends IValQ{

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

export class ProductoService extends Service_Util< Producto, IProducto<any>,  ProductoCtrl_Util, IProducto<IValQ_Producto>> {

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
        super.U_afs = this._afs;
        
        //Objeto con metodos y propiedeades de utilidad para el service
        this.ModeloCtrl_Util = new ProductoCtrl_Util();

        //establece un limite predefinido (es personalizable)
        this.limitePaginaPredefinido = 4;//10;

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
    //limite:
    //indica el numero maximo de docs que puede leer en la query, si no se
    //recibe se le asigna el limite predefinido para todas las querys
    //
    //docInicial:
    //solo es necesario recibirlo si por alguna razon se quiere paginar 
    //No teniendo como base los snapshotsDocs sino otra cosa
    public getProductos$(doc$:IDoc$<Producto, IProducto<IValQ_Producto>> | null, 
                        RFS:IRunFunSuscribe<Producto>, 
                        valQuery:IProducto<IValQ_Producto> | null, 
                        limite=this.limitePaginaPredefinido, 
                        docInicial:any=null, 
                        ):IDoc$<Producto, IProducto<IValQ_Producto>>{
        
        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this._pathColeccion; 
        const isColeccionGrup = false;       
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                      QFiltro: IQFiltro<IProducto<IValQ_Producto>>) => {

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
        const QFiltro:IQFiltro<IProducto<IValQ_Producto>> = {
            query : query,
            docInicial : docInicial,
            limite: limite,
            tipoPaginar : EtipoPaginar.Full,
            valQuery : (valQuery && valQuery != null)? valQuery : <IProducto<IValQ_Producto>>{_id:{_orden:"asc"}}
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
    //No requiere ni limite ni docInicial ya que se sobreentiende que devuelve solo 1 doc
    public getProductoId$(doc$:IDoc$<Producto, IProducto<IValQ_Producto>> | null, 
                          RFS:IRunFunSuscribe<Producto>, 
                          valQuery:IProducto<IValQ_Producto> | null
                          ):IDoc$<Producto, IProducto<IValQ_Producto>>{

        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this._pathColeccion; 
        const isColeccionGrup = false;    
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                     QFiltro: IQFiltro<IProducto<IValQ_Producto>>) => {

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
        const QFiltro:IQFiltro<IProducto<IValQ_Producto>> = {
            query : query,
            docInicial : null,
            limite: 1,
            tipoPaginar : EtipoPaginar.No,
            valQuery : (valQuery && valQuery != null)? valQuery : <IProducto<IValQ_Producto>>{_id:{_orden:"asc"}}
        }        
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, pathColeccion, isColeccionGrup);
    }

    //TEST---------------------------------------------------------------------------------------------------------------------------
    public getProductosPorNombre$(doc$:IDoc$<Producto, IProducto<IValQ_Producto>> | null, 
                                  RFS:IRunFunSuscribe<Producto>, 
                                  valQuery:IProducto<IValQ_Producto>, 
                                  limite=this.limitePaginaPredefinido, 
                                  docInicial:any=null
                                  ):IDoc$<Producto, IProducto<IValQ_Producto>>{
        
        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this._pathColeccion; 
        const isColeccionGrup = false;       
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                      QFiltro: IQFiltro<IProducto<IValQ_Producto>>) => {

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
            if (QFiltro.valQuery && QFiltro.valQuery.nombre) {
                let keyIni = this.ModeloCtrl_Util.nombre.formateoCampo(QFiltro.valQuery.nombre.ini);
                //se calcula la keyFin que sera un caracter superior al keyIni
                let keyFin = this.ModeloCtrl_Util.getLlaveFinBusquedaStrFirestore(keyIni);
    
                //se establecen los rangos, entre mas texto tengan cada key mas precisa es la busqueda
                cursorQueryRef = cursorQueryRef.where(this.ModeloCtrl_Util.nombre.nom, ">=", keyIni)
                                               .where(this.ModeloCtrl_Util.nombre.nom, "<", keyFin);
            }
    
            //================================================================
            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef =  cursorQueryRef.orderBy(this.ModeloCtrl_Util.nombre.nom, QFiltro.valQuery.nombre._orden || "asc");
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
        const QFiltro:IQFiltro<IProducto<IValQ_Producto>> = {
            query : query,
            docInicial : docInicial,
            limite: limite,
            tipoPaginar : EtipoPaginar.Simple,
            valQuery : (valQuery && valQuery != null)? valQuery : <IProducto<IValQ_Producto>>{nombre:{_orden:"asc"}}
        }        
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, pathColeccion, isColeccionGrup);
    }

    public getProductosPorPrecio$(doc$:IDoc$<Producto, IProducto<IValQ_Producto>> | null, 
                                  RFS:IRunFunSuscribe<Producto>, 
                                  valQuery:IProducto<IValQ_Producto> | null,
                                  limite=this.limitePaginaPredefinido, 
                                  docInicial:any=null
                                  ):IDoc$<Producto, IProducto<IValQ_Producto>>{
        
        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this._pathColeccion; 
        const isColeccionGrup = false;       
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                      QFiltro: IQFiltro<IProducto<IValQ_Producto>>) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;

            //verificar si se tienen el valor a consultar
            if (QFiltro.valQuery.precio) {

                if (QFiltro.valQuery.precio.val) {

                    //================================================================
                    //consulta de igualdad especial para campos number (normales o dentro de 
                    //campos map) en firestore.
                    //por comportamiento estraño de firestore no se puede consultar 
                    //y paginar igualdades en campos number (ni boolean) por lo que es 
                    //necesario realizar esta extraña consulta en la cual se usa el valor
                    //a igualar  ini con un limite maximo   iniFactor  que es agregarle
                    //una unidad mas al   ini para poder realizar la consulta

                    //ESTO NO FUNCIONA si se quiere iguaral y paginar:
                    //cursorQueryRef = cursorQueryRef.where(this.model_Util.precio.nom, "==", ini) //NO SIRVE

                    let ini = this.ModeloCtrl_Util.precio.formateoCampo(QFiltro.valQuery.precio.val); 
                    let iniMaxFactor = ini + this.ModeloCtrl_Util.precio.maxFactorIgualdadQuery;
                    cursorQueryRef = cursorQueryRef.where(this.ModeloCtrl_Util.precio.nom, ">=", ini)
                                     .where(this.ModeloCtrl_Util.precio.nom, "<", iniMaxFactor);
                    //================================================================

                }

                if ((QFiltro.valQuery.precio.min ||
                    QFiltro.valQuery.precio.max) &&
                    !QFiltro.valQuery.precio.val) {
                    //================================================================
                    //consulta basica de entre minimo y maximo
                    if (QFiltro.valQuery.precio.min &&
                        QFiltro.valQuery.precio.max) {
                        cursorQueryRef = cursorQueryRef.where(this.ModeloCtrl_Util.precio.nom, ">=", QFiltro.valQuery.precio.min)
                            .where(this.ModeloCtrl_Util.precio.nom, "<", QFiltro.valQuery.precio.max);
                    } else {
                        if (QFiltro.valQuery.precio.min) {
                            cursorQueryRef = cursorQueryRef.where(this.ModeloCtrl_Util.precio.nom, ">=", QFiltro.valQuery.precio.min);
                        }
                        if (QFiltro.valQuery.precio.max) {
                            cursorQueryRef = cursorQueryRef.where(this.ModeloCtrl_Util.precio.nom, "<=", QFiltro.valQuery.precio.max);
                        }
                    }
                    //================================================================
                }
            }

            //================================================================
            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef =  cursorQueryRef.orderBy(this.ModeloCtrl_Util.precio.nom, QFiltro.valQuery.precio._orden || "asc");
            cursorQueryRef = cursorQueryRef.limit(QFiltro.limite || this.limitePaginaPredefinido);  // 
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
        const QFiltro:IQFiltro<IProducto<IValQ_Producto>> = {
            query : query,
            docInicial : docInicial,
            limite: limite,
            tipoPaginar : EtipoPaginar.Simple,
            valQuery : (valQuery && valQuery != null)? valQuery : <IProducto<IValQ_Producto>>{precio:{_orden:"asc"}}
        }        
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, pathColeccion, isColeccionGrup);
    }    

    public getProductosPorMiscRuedas$(doc$:IDoc$<Producto, IProducto<IValQ_Producto>> | null, 
                                     RFS:IRunFunSuscribe<Producto>, 
                                     valQuery:IProducto<IValQ_Producto> | null, 
                                     limite=this.limitePaginaPredefinido, 
                                     docInicial:any=null
                                     ):IDoc$<Producto, IProducto<IValQ_Producto>>{
        
        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this._pathColeccion; 
        const isColeccionGrup = false;       
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                      QFiltro: IQFiltro<IProducto<IValQ_Producto>>) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;

            //verificar si se tienen el valor a consultar
            if (QFiltro.valQuery.map_miscelanea.ruedas) {
    
                if (QFiltro.valQuery.map_miscelanea.ruedas.val) {
    
                    //================================================================
                    //consulta de igualdad especial para campos number (normales o dentro de 
                    //campos map) en firestore.
                    //por comportamiento estraño de firestore no se puede consultar 
                    //y paginar igualdades en campos number (ni boolean) por lo que es 
                    //necesario realizar esta extraña consulta en la cual se usa el valor
                    //a igualar  ini con un limite maximo   iniFactor  que es agregarle
                    //una unidad mas al   ini para poder realizar la consulta
    
                    //ESTO NO FUNCIONA si se quiere iguara y paginar:
                    //cursorQueryRef = cursorQueryRef.where(this.model_Util.precio.nom, "==", ini) //NO SIRVE
    
                    let ini = QFiltro.valQuery.map_miscelanea.ruedas.val;
                    let iniFactor = ini + this.ModeloCtrl_Util.precio.maxFactorIgualdadQuery;
                    cursorQueryRef = cursorQueryRef.where(this.ModeloCtrl_Util.map_miscelanea.util.ruedas.nomMapPath, ">=", ini)
                                                    .where(this.ModeloCtrl_Util.map_miscelanea.util.ruedas.nomMapPath, "<", iniFactor);
                    //================================================================
                }
    
                if ((QFiltro.valQuery.map_miscelanea.ruedas.min ||
                    QFiltro.valQuery.map_miscelanea.ruedas.max) &&
                    !QFiltro.valQuery.map_miscelanea.ruedas.val) {
                    //================================================================
                    //consulta basica de entre minimo y maximo
                    if (QFiltro.valQuery.map_miscelanea.ruedas.min &&
                        QFiltro.valQuery.map_miscelanea.ruedas.max) {
    
                        cursorQueryRef = cursorQueryRef.where(this.ModeloCtrl_Util.map_miscelanea.util.ruedas.nomMapPath, ">=", QFiltro.valQuery.map_miscelanea.ruedas.min)
                            .where(this.ModeloCtrl_Util.map_miscelanea.util.ruedas.nomMapPath, "<", QFiltro.valQuery.map_miscelanea.ruedas.max);
    
                    } else {
                        if (QFiltro.valQuery.map_miscelanea.ruedas.min) {
                            cursorQueryRef = cursorQueryRef.where(this.ModeloCtrl_Util.map_miscelanea.util.ruedas.nomMapPath, ">=", QFiltro.valQuery.map_miscelanea.ruedas.min);
                        }
                        if (QFiltro.valQuery.map_miscelanea.ruedas.max) {
                            cursorQueryRef = cursorQueryRef.where(this.ModeloCtrl_Util.map_miscelanea.util.ruedas.nomMapPath, "<=", QFiltro.valQuery.map_miscelanea.ruedas.max);
                        }
                    }

                    //================================================================
                }
            }
    
            //================================================================
            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef =  cursorQueryRef.orderBy(this.ModeloCtrl_Util.map_miscelanea.util.ruedas.nomMapPath, QFiltro.valQuery.map_miscelanea.ruedas._orden || null);
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
        const QFiltro:IQFiltro<IProducto<IValQ_Producto>> = {
            query : query,
            docInicial : docInicial,
            limite: limite,
            tipoPaginar : EtipoPaginar.Simple,
            valQuery : (valQuery && valQuery != null)? valQuery : <IProducto<IValQ_Producto>>{map_miscelanea:{ruedas:{_orden:"asc"}}}
        }        
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, pathColeccion, isColeccionGrup);
    }    

    public getProductosPorArrayNormal$(doc$:IDoc$<Producto, IProducto<IValQ_Producto>> | null, 
                                       RFS:IRunFunSuscribe<Producto>, 
                                       valQuery:IProducto<IValQ_Producto> | null,
                                       limite=this.limitePaginaPredefinido,
                                       docInicial:any=null
                                       ):IDoc$<Producto, IProducto<IValQ_Producto>>{
        
        //================================================
        //configurar el pathColeccion solo para coleccion:
        const pathColeccion = this._pathColeccion; 
        const isColeccionGrup = false;       
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, 
                      QFiltro: IQFiltro<IProducto<IValQ_Producto>>) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;

            //================================================================
            //los campos de tipo array y mapA_ REQUIEREN CREAR INDICE EN FIRESTORE
            //IMPORTANTE: los campos array y mapA_ tienen pocas opciones de consulta
            //intentar no usarlos para procesar consultas 
            cursorQueryRef = cursorQueryRef.where("arrayNormal", "array-contains", "negro");

            //================================================================
            //ordenar, limitar y prepaginar con docInicial    
            cursorQueryRef = cursorQueryRef.orderBy("arrayNormal", "asc");
            cursorQueryRef = cursorQueryRef.limit(QFiltro.limite || this.limitePaginaPredefinido);  // 
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
        const QFiltro:IQFiltro<IProducto<IValQ_Producto>> = {
            query : query,
            docInicial : docInicial,
            limite: limite,
            tipoPaginar : EtipoPaginar.Simple,
            valQuery : valQuery //-posible error
        }        
        //================================================================
        return this.leerDocs$(doc$, QFiltro, RFS, pathColeccion, isColeccionGrup);
    }   
    //------------------------------------------------------------------------------------------------------------------------------
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
    public getProductos_Path_Id$(docPath_Id$:IDocPath_Id$<Producto>, 
                                RFS:IRunFunSuscribe<Producto>, 
                                path_Id:string | null 
                                ):IDocPath_Id$<Producto>{

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
    public paginarProductos$(doc$:IDoc$<Producto, IProducto<IValQ_Producto>>, 
                            direccionPaginacion: "previo" | "siguiente"
                            ):IDoc$<Producto, IProducto<IValQ_Producto>> {

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
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public crearProducto(docNuevo: Producto, v_PreMod?:Iv_PreModificar_Producto): Promise<void> {

        //TEST----------------------------------------------
        let numId = this.ModeloCtrl_Util.getNumOrderKey(this.ultimoID);
        let loteNuevos = <Producto[]>[
            {
                _id: "",
                nombre: `Prueba${numId}`,
                categoria: `Prueba${numId}`,
                precio: 400,
                map_miscelanea: {
                    tipo: "vehiculo",
                    ruedas: 4
                },
                mapA_misc: [
                    { color: "cafe" },
                    { color: "verde" },
                    { color: "amarillo" }
                ],
                v_precioImpuesto: 120
            },
            {
                _id: "",
                nombre: `Prueba${numId}`,
                categoria: `Prueba${numId}`,
                precio: 400,
                map_miscelanea: {
                    tipo: "vehiculo",
                    ruedas: 4
                },
                mapA_misc: [
                    { color: "cafe" },
                    { color: "verde" },
                    { color: "amarillo" }
                ],
                v_precioImpuesto: 120
            },
            {
                _id: "",
                nombre: `Prueba${numId}`,
                categoria: `Prueba${numId}`,
                precio: 400,
                map_miscelanea: {
                    tipo: "vehiculo",
                    ruedas: 4
                },
                mapA_misc: [
                    { color: "cafe" },
                    { color: "verde" },
                    { color: "amarillo" }
                ],
                v_precioImpuesto: 120
            },
            {
                _id: "",
                nombre: `Prueba${numId}`,
                categoria: `Prueba${numId}`,
                precio: 400,
                map_miscelanea: {
                    tipo: "vehiculo",
                    ruedas: 4
                },
                mapA_misc: [
                    { color: "cafe" },
                    { color: "verde" },
                    { color: "amarillo" }
                ],
                v_precioImpuesto: 120
            },
            {
                _id: "",
                nombre: `Prueba${numId}`,
                categoria: `Prueba${numId}`,
                precio: 400,
                map_miscelanea: {
                    tipo: "vehiculo",
                    ruedas: 4
                },
                mapA_misc: [
                    { color: "cafe" },
                    { color: "verde" },
                    { color: "amarillo" }
                ],
                v_precioImpuesto: 120
            },
            {
                _id: "",
                nombre: `Prueba${numId}`,
                categoria: `Prueba${numId}`,
                precio: 400,
                map_miscelanea: {
                    tipo: "vehiculo",
                    ruedas: 4
                },
                mapA_misc: [
                    { color: "cafe" },
                    { color: "verde" },
                    { color: "amarillo" }
                ],
                v_precioImpuesto: 120
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
        docNuevo = this.ModeloCtrl_Util.preCrearOActualizar(docNuevo, this.ultimoID, true, false, v_PreMod);
        //================================================================
        return this.crearDoc(docNuevo, this.ModeloCtrl_Util.getPathColeccion());
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
    //isEditadoFuerte:
    //determina si se REEMPLAZAN los campos map_ y mapA_
    //o no se modifican
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public actualizarProducto(docEditado: Producto, isEditadoFuerte = false, v_PreMod?:Iv_PreModificar_Producto): Promise<void> {
        //TEST--------------------------------------------
        docEditado = <Producto>{
            _id: "1-9c73bc52fc92837d",
            // nombre:"Spark GT",
            // categoria: "carro",
            // precio: 140,
            map_miscelanea: {
                tipo: "vehiculo",
                ruedas: 4
            },
            // mapA_misc:[
            //   {color: "rojo"},
            //   {color: "Morado"}
            // ],
            v_precioImpuesto: 120
        }
        //------------------------------------------------
        //================================================================
        //pre modificacion y formateo del doc
        docEditado = this.ModeloCtrl_Util.preCrearOActualizar(docEditado, this.ultimoID, false, isEditadoFuerte, v_PreMod);
        //================================================================
        return this.actualizarDoc(docEditado, this.ModeloCtrl_Util.getPathColeccion());

    }
    //================================================================
    /*eliminar {modelo}*/
    //permite la eliminacion de un doc por medio del _id
    //Parametros:
    //
    //_id:
    //estring con id a eliminar
    //
    public eliminarProducto(_id: string): Promise<void> {
        //Test-------------------------------------------
        _id = "2-a940c69dbf6536cc";
        //------------------------------------------------
        return this.eliminarDoc(_id, this.ModeloCtrl_Util.getPathColeccion());
    }

    //================================================================================================================================
    //desuscribir observables pricipales
    public unsubscribeAllProductos$(docs$:IDoc$<Producto, IProducto<IValQ_Producto>>[], docPath_Id$:IDocPath_Id$<Producto>):void {
        
        //================================================
        //agrego el control doc$ que hace referencia 
        //al monitoreo interoa del ultimoDoc
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
    //================================================================

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

export class ProductoCtrl_Util extends Ctrl_Util<Producto, IProducto<any>, ProductoCtrl_Util> 
                               implements IProducto<any> {

    //================================================================
    //atributos con funcionalidades para cada campo:
    _id:IUtilCampo<string, any> = {
        nom:"_id",
    };
    _pathDoc:IUtilCampo<string, any> = {
        nom:"_pathDoc",
    };

    nombre:IUtilCampo<string, any> = {
        nom : "nombre",
        isRequerido:true,
        formateoCampo:(val)=>{
            if (val && val != null) {
                const util = new ProductoCtrl_Util();
                const c_util = util.nombre;
                val = val.trim();                
            }
            return val
        },
    };
    precio:IUtilCampo<number, any> = {
        nom:"precio",
        isRequerido:true,
        maxFactorIgualdadQuery : 1,
        expFactorRedondeo : null,
        formateoCampo:(val)=>{
            if (val && val != null) {
                const util = new ProductoCtrl_Util();
                const c_util = util.precio;
                //demostracion de ajuste de redondeo --funcional mas no necesario por ahora--:
                val = util.ajustarDecimales("round", val, c_util.expFactorRedondeo);                
            }
            return val
        },
    };
    categoria:IUtilCampo<string, any> = {
        nom:"categoria"
    };
    map_miscelanea:IUtilCampo<IMap_miscelanea<any>, Map_miscelanea_Util> = {
        nom:"map_miscelanea",
        isMap:true,
        util: new Map_miscelanea_Util()

    }; 
    mapA_misc:IUtilCampo<IMapA_misc<any>, MapA_misc_Util> ={
        nom : "mapA_misc",
        isMap : true,
        isArray : true,
        util : new MapA_misc_Util()
    }; 

    emb_SubColeccion:IUtilCampo<any, any> = {
        nom : "emb_SubColeccion",
        isEmbebido : true
    }

    v_precioImpuesto:IUtilCampo<number, any> = {
        nom:"v_precioImpuesto",
        isVirtual:true
    }    
    //================================================================

    constructor() {
        super();
    }
    //================================================================
    /*getNomColeccion()*/
    //obtener el nombre de la coleccion o subcoleccion SIN PATH
    public getNomColeccion():string{
        return "Productos";
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

    public preCrearOActualizar(doc:Producto,
                                ultimo_id:string,
                                isCrear:boolean=true,
                                isEditadoFuerte=false, 
                                v_PreMod?:Iv_PreModificar_Producto
                              ):Producto{
        
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
            // de las colecciones SIEMPRE será el pathColeccion estandar
            //IMPORTANTE: SOLO PARA COLECCIONES
            doc._pathDoc = `${this.getPathColeccion()}/${doc._id}`;
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
    public preLeerDocs(docs:Producto[] | Producto, v_utilesPreLeer:Iv_PreLeer_Producto):Producto[] | Producto{

        if(docs){
            if(Array.isArray(docs)){
                docs = docs.map((doc)=>{
                    //================================================================
                    //aqui todo lo referente a la modificacion de cada documento antes 
                    //de devolverlo
                    doc.v_precioImpuesto = ((doc.precio * v_utilesPreLeer.imp)/100) + doc.precio;
                    //================================================================
                    return doc;
                });
            }else{
                //================================================================
                //aqui todo lo referente a la modificacion de cada documento antes 
                //de devolverlo
                docs.v_precioImpuesto = ((docs.precio * v_utilesPreLeer.imp)/100) + docs.precio;
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
export class  Map_miscelanea_Util implements IMap_miscelanea<any>{
    ruedas:IUtilCampo<number, any> = {
        nom:"ruedas",
        nomMapPath: "map_miscelanea.ruedas",
        maxFactorIgualdadQuery : 1,
        expFactorRedondeo : null
    };

    tipo:IUtilCampo<string, any> = {
        nom:"tipo",
        nomMapPath: "map_miscelanea.tipo"
    };
}

export class  MapA_misc_Util implements IMapA_misc<any>{
    color:IUtilCampo<string, any> = {
        nom:"color",
        nomMapPath: "map_miscelanea.color", //por ahora, no sirve en array
        maxFactorIgualdadQuery : 1
    };
}

//================================================================================================================================



