//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { IProducto, Producto, IMap_miscelanea, IMapA_misc } from '../../../models/firebase/producto/producto';
import { Producto_Meta, Map_miscelanea_Meta, MapA_misc_Meta } from './producto_Meta';
import { IValuesQueryProducto, IValuesHooksProducto } from '../../IModels-Hooks-Querys/IProducto/IProducto';

import { Fs_ModelService, ETypePaginate, ETypePaginatePopulate, Ifs_Filter, Fs_HooksService } from '../fs_Model_Service';
import { Fs_Util } from '../fs_Util';

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*class HooksService[Model]*/
//contiene tanto los contenedores de valores para administrar los hoooks como los metodos 
//hooks propiamente dichos para este ModelService
export class HooksServiceProducto extends Fs_HooksService<Producto, Producto_Meta> implements IValuesHooksProducto<Producto_Meta> {
    
    //================================================
    //objetos que almacenan los valores para procesar 
    //los  metodos hooks, se inicializan con valores por default
    v_preGet = {
        imp:0
    };
    v_preMod = {};
    v_preDelete = {};
    v_postMod = {};
    v_postDelete = {};    
    //================================================

    constructor(
        public model_Meta: Producto_Meta,
        public fs_Util: Fs_Util<Producto, Producto_Meta>
    ) { 
        super();
    }

    //================================================================
    //metodos Hooks de pre y post ()
    //Si no ejecutan una logica interna simplemente devolver el Doc 
    //que reciben (en el caso de los pre)
    public preGetDoc(Doc: Producto): Producto {
        
        //determinar si doc existe para poder 
        //procesarlo de lo contrario devolverlo como null
        if (!Doc || Doc == null) {
            return Doc
        }

        //determinar si se debe hacer un preGet
        if (this.fs_Util.isObjNotEmpty(this.v_preGet)) {
            //aqui la logica de modificacion al doc original
            Doc.v_precioImpuesto = ((Doc.precio * this.v_preGet.imp)/100) + Doc.precio;
        }

        return Doc;
    }
    public preModDoc(
        Doc: Producto, 
        isCreate: boolean,
        isStrongUpdate:boolean, 
        path_EmbBase?: string, 
    ): Producto {
        //================================================================
        //se determina si se desea crear el documento para su configuracion
        if (isCreate) {
            //================================================================
            //se determina si se genera un _id personalizado o si el objeto ya
            //trae consigo un _id de una fuente externa
            Doc._id = (Doc._id && typeof Doc._id === 'string' && Doc._id != "") ?
                Doc._id :
                this.fs_Util.createIds();
            
            //aqui se genera el   _pathDoc   del doc a crear
            Doc._pathDoc = this.fs_Util.create_pathDoc(Doc._id, path_EmbBase || "");
            //================================================================
        }

        //se determina si existen valores de modificacion 
        if (this.fs_Util.isObjNotEmpty(this.v_preMod)) {
            //...aqui toda la modificacion y formateo especial previo a guardar
        }

        //================================================================
        //aqui se formatean los datos del documento (se quitan campos 
        //inecesarios (no almacenables))
        Doc = this.fs_Util.formatearDoc(Doc, this.model_Meta, isStrongUpdate);
        //================================================================     
        
        return Doc; 
    }
    public preDeleteDoc(_id:string): string {
        return _id;
    }
    

    public postModDoc(Doc: Producto, isCreate:boolean) {
        //determinar si fue creado o editado
        if (isCreate) {
            //..aqui si fue creado
        } else {
            //..aqui si fue actualizado          
        }
        return;
    }
    public postDeleteDoc(_id:string) {
        return;
    }
    //================================================================

}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*Ifs_Filter[Model]*/
//esta interfaz es SOLO referencial para heredar las demas,
//aqui se podria personalizar valores para la Query unicamente para firestore
export interface Ifs_FilterProducto extends IValuesQueryProducto, Ifs_Filter{}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
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

export class ProductoService extends Fs_ModelService< Producto, Producto_Meta, Ifs_FilterProducto> {

    //contiene el objeto hook exclusivo para este servicio
    public hooksModelService: HooksServiceProducto

    constructor(
        private _afs: AngularFirestore
    ) {
        super();

        //indispensable dejar una referencia de_afs en la clase padre
        //IMPORTANTE: los servicios (como AngularFirestore) no se pueden 
        //inyectar directamente en la clase padre por problemas con super()
        this.U_afs = this._afs;

        //la clase padre recibe TODOS los services 
        //foraaneos que se requieren para este servicio
        //si no hay servicios foraneos se deja un array vacio
        this.f_services = [];

        //Objeto con metodos y propiedeades de utilidad para el service
        this.Model_Meta = new Producto_Meta();
        this._Util = new Fs_Util(this.Model_Meta);
        this.hooksModelService = new HooksServiceProducto(this.Model_Meta, this._Util)
        this.hooksInsideService = this.hooksModelService;

        //establece un limite predefinido para este 
        //service (es personalizable incluso se puede 
        //omitir y dejar el de la clase padre)
        // this.defaultPageLimit=10;
        // this.defaultLimitPopulate=10
        

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
        keyHandler:string, 
        filter:Ifs_FilterProducto, 
    ):void{
        //configuracion predeterminada de propiedades de consulta:        
        filter.order = (filter.order) ? filter.order : <IProducto<"asc"|"desc">>{_id:"asc"};
        
        //configurar tipo de paginacion deseada:
        filter.typePaginate =  (filter.typePaginate)? filter.typePaginate : ETypePaginate.Full;
   
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        filter.query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, BhFilter:Ifs_FilterProducto) => {

            let cursorQueryRef = ref;

            //================================================================
            //ordenar, limitar y prepaginar con startDoc
            cursorQueryRef = cursorQueryRef.orderBy(this.Model_Meta._id.nom, BhFilter.order._id);
            cursorQueryRef = cursorQueryRef.limit(BhFilter.limit);
            if (BhFilter.typePaginate == ETypePaginate.Single || BhFilter.typePaginate == ETypePaginate.Full) {
                cursorQueryRef = cursorQueryRef.startAfter(BhFilter.startDoc);
            }
            //================================================================
            return cursorQueryRef;
        };

        this.configHandlerForNewQuery$(keyHandler, filter);
        return 
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
    //control$:
    //objeto  con toda la informacion de la lectura reactiva
    //
    //_id:
    //el id del documento, este _id puede ser de una fuente externa
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //
    //path_EmbBase:
    //es opcional para colecciones, es Obligatorios para subcolecciones 
    //y que NO se desee consulta en collectionGroup
    //
    //No requiere ni limite ni docInicial ya que se sobreentiende que devuelve solo 1 doc
    public getId$(
        keyHandler:string, 
        _id:string,
        path_EmbBase:string = null,
    ):void{
        super.getId$(keyHandler, _id, path_EmbBase);
        return;
    }

    //TEST---------------------------------------------------------------------------------------------------------------------------
    public getPorNombre$(
        keyHandler:string,
        filter:Ifs_FilterProducto,
    ):void{
        
        //configuracion predeterminada de propiedades de consulta:        
        filter.order = (filter.order) ? filter.order : <IProducto<"asc"|"desc">>{nombre:"asc"};

        //configurar tipo de paginacion deseada:
        filter.typePaginate =  (filter.typePaginate)? filter.typePaginate : ETypePaginate.Full;
          
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        filter.query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, BhFilter:Ifs_FilterProducto) => {

            let cursorQueryRef = ref;

            //================================================================
            //Query Condiciones:
            //
            //firestore no permite condiciones de busqueda avanzadas para strings 
            //asi que para suplir la consulta de textos que comiencen por algun texto
            //
            //se usa una consulta con 2 keys limitadoras y se obtiene todos los documentos 
            //que esten dentro de ese rango
            //
            let keyIni = BhFilter.VQ_IniStr.nombre.trim();
            //se calcula la keyFin que sera un caracter superior al keyIni
            let keyFin = this._Util.getLlaveFinBusquedaStrFirestore(keyIni);

            //se establecen los rangos, entre mas texto tengan cada key mas precisa es la busqueda
            cursorQueryRef = cursorQueryRef.where(this.Model_Meta.nombre.nom, ">=", keyIni)
                                           .where(this.Model_Meta.nombre.nom, "<", keyFin);

            //================================================================
            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef =  cursorQueryRef.orderBy(this.Model_Meta.nombre.nom, BhFilter.order.nombre);
            cursorQueryRef = cursorQueryRef.limit(BhFilter.limit);      
            if (BhFilter.typePaginate == ETypePaginate.Single || BhFilter.typePaginate == ETypePaginate.Full) {
                cursorQueryRef = cursorQueryRef.startAfter(BhFilter.startDoc);                    
            }   
                
            return cursorQueryRef;
        };
  
        this.configHandlerForNewQuery$(keyHandler, filter);
        return

    }

    public getPorPrecio$(
        keyHandler:string,
        filter:Ifs_FilterProducto,
    ):void{
        
        //configuracion predeterminada de propiedades de consulta:        
        filter.order = (filter.order) ? filter.order : <IProducto<"asc"|"desc">>{precio:"asc"};

        //configurar tipo de paginacion deseada:
        filter.typePaginate =  (filter.typePaginate)? filter.typePaginate : ETypePaginate.Full;
            
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        filter.query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, BhFilter:Ifs_FilterProducto) => {

            let cursorQueryRef= ref;

            //determinar si se busca el precio igual
            if(BhFilter.VQ_EqualNum.precio){
                    
                    //consulta de igualdad especial para campos number (normales o dentro de 
                    //campos map) en firestore.
                    //por comportamiento estraño de firestore no se puede consultar 
                    //y paginar igualdades en campos number (ni boolean) por lo que es 
                    //necesario realizar esta extraña consulta en la cual se usa el valor
                    //a igualar  ini con un limite maximo   iniFactor  que es agregarle
                    //una unidad mas al   ini para poder realizar la consulta

                    //ESTO NO FUNCIONA si se quiere iguaral y paginar:
                    //cursorQueryRef = cursorQueryRef.where(this.model_Util.precio.nom, "==", ini) //NO SIRVE

                    let ini = this._Util.ajustarDecimales("round", BhFilter.VQ_EqualNum.precio, this.Model_Meta.precio.expFactorRedondeo);   
                    let iniMaxFactor = ini + this.Model_Meta.precio.maxFactorIgualdadQuery;
                    cursorQueryRef = cursorQueryRef.where(this.Model_Meta.precio.nom, ">=", ini)
                                     .where(this.Model_Meta.precio.nom, "<", iniMaxFactor);
            }

            //determinar si se busca el precio mayor igual
            if (BhFilter.VQ_GtEqNum.precio) {
                cursorQueryRef = cursorQueryRef.where(this.Model_Meta.precio.nom, ">=", BhFilter.VQ_GtEqNum.precio);
            }
            //determinar si se busca el precio menor igual
            if (BhFilter.VQ_LtEqNum.precio) {
                cursorQueryRef = cursorQueryRef.where(this.Model_Meta.precio.nom, "<=", BhFilter.VQ_LtEqNum.precio);
            }

            //determinar si se busca el precio entre
            if (BhFilter.VQ_BtNum.precio) {
                cursorQueryRef = cursorQueryRef.where(this.Model_Meta.precio.nom, ">=", BhFilter.VQ_BtNum.precio.Gt)
                .where(this.Model_Meta.precio.nom, "<", BhFilter.VQ_BtNum.precio.Lt);
            }

            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef =  cursorQueryRef.orderBy(this.Model_Meta.precio.nom, BhFilter.order.precio);
            cursorQueryRef = cursorQueryRef.limit(BhFilter.limit);      
            if (BhFilter.typePaginate == ETypePaginate.Single || BhFilter.typePaginate == ETypePaginate.Full) {
                cursorQueryRef = cursorQueryRef.startAfter(BhFilter.startDoc);                    
            }    
            
            return cursorQueryRef;
        };

        this.configHandlerForNewQuery$(keyHandler, filter);
        return
    }    

    public getPorMiscRuedas$(
        keyHandler:string,
        filter:Ifs_FilterProducto,
    ):void{
        
        //configuracion predeterminada de propiedades de consulta:        
        filter.order = (filter.order) ? filter.order : <IProducto<"asc"|"desc">>{map_miscelanea:"asc"}; //los mapas embebidos no pueden ordenarse en profundidad, el orden es desde la propiedad padre

        //---------------------------------------------------
        //ejemplo de como asignar un valor de consulta a una 
        //propiedad de un objeto map en Firestores
        filter.VQ_EqualNum.map_miscelanea = (filter.VQ_EqualNum.map_miscelanea) ?
                                            filter.VQ_EqualNum.map_miscelanea :
                                            <IMap_miscelanea<number>>{ ruedas: 10 }; //el cast y la asignacion del valor
        //---------------------------------------------------
        
        //configurar tipo de paginacion deseada:
        filter.typePaginate =  (filter.typePaginate)? filter.typePaginate : ETypePaginate.Full;
 
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        filter.query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, BhFilter:Ifs_FilterProducto) => {

            let cursorQueryRef = ref;

            //determinar si se busca el .map_miscelanea.ruedas igual
            if (BhFilter.VQ_EqualNum.map_miscelanea.ruedas) {

                //consulta de igualdad especial para campos number (normales o dentro de 
                //campos map) en firestore.
                //por comportamiento estraño de firestore no se puede consultar 
                //y paginar igualdades en campos number (ni boolean) por lo que es 
                //necesario realizar esta extraña consulta en la cual se usa el valor
                //a igualar  ini con un limite maximo   iniFactor  que es agregarle
                //una unidad mas al   ini para poder realizar la consulta

                //ESTO NO FUNCIONA si se quiere iguaral y paginar:
                //cursorQueryRef = cursorQueryRef.where(this.model_Util.precio.nom, "==", ini) //NO SIRVE

                let ini = this._Util.ajustarDecimales("round", BhFilter.VQ_EqualNum.map_miscelanea.ruedas, this.Model_Meta.map_miscelanea.extMeta.ruedas.expFactorRedondeo);
                let iniMaxFactor = ini + this.Model_Meta.precio.maxFactorIgualdadQuery;
                cursorQueryRef = cursorQueryRef.where(this.Model_Meta.map_miscelanea.extMeta.ruedas.nomMapPath, ">=", ini)
                    .where(this.Model_Meta.map_miscelanea.extMeta.ruedas.nomMapPath, "<", iniMaxFactor);
            }

            //determinar si se busca el .map_miscelanea.ruedas mayor igual
            if (BhFilter.VQ_GtEqNum.map_miscelanea.ruedas) {
                cursorQueryRef = cursorQueryRef.where(this.Model_Meta.map_miscelanea.extMeta.ruedas.nomMapPath, ">=", BhFilter.VQ_GtEqNum.map_miscelanea.ruedas);
            }
            //determinar si se busca el .map_miscelanea.ruedas menor igual
            if (BhFilter.VQ_LtEqNum.map_miscelanea.ruedas) {
                cursorQueryRef = cursorQueryRef.where(this.Model_Meta.map_miscelanea.extMeta.ruedas.nomMapPath, "<=", BhFilter.VQ_LtEqNum.map_miscelanea.ruedas);
            }

            //================================================================
            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef =  cursorQueryRef.orderBy(this.Model_Meta.map_miscelanea.extMeta.ruedas.nomMapPath, BhFilter.order.map_miscelanea); //el orden lo da la propiedad padre del map
            cursorQueryRef = cursorQueryRef.limit(BhFilter.limit);  
            if (BhFilter.typePaginate == ETypePaginate.Single || BhFilter.typePaginate == ETypePaginate.Full) {
                cursorQueryRef = cursorQueryRef.startAfter(BhFilter.startDoc);                    
            }    
            //================================================================                              
            return cursorQueryRef;
        };

        this.configHandlerForNewQuery$(keyHandler, filter);
        return
    }    

    public getPorArrayNormal$(
        keyHandler:string,
        filter:Ifs_FilterProducto,
    ):void{
        //configuracion predeterminada de propiedades de consulta:        
        //--No se sabe como hacer el orden en array---
        //QValue.order = (QValue.order) ? QValue.order : <IUsuario<"asc"|"desc">>{nombre:"asc"};
        filter.limit = (filter.limit) ? filter.limit : this.defaultPageLimit;

        //configurar tipo de paginacion deseada:
        filter.typePaginate =  (filter.typePaginate)? filter.typePaginate : ETypePaginate.Full;
        
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        filter.query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query, BhFilter:Ifs_FilterProducto) => {

            let cursorQueryRef = ref;

            //================================================================
            //los campos de tipo array y mapA_ REQUIEREN CREAR INDICE EN FIRESTORE
            //IMPORTANTE: los campos array y mapA_ tienen pocas opciones de consulta
            //intentar no usarlos para procesar consultas 
            cursorQueryRef = cursorQueryRef.where("arrayNormal", "array-contains", "negro");

            //================================================================
            //ordenar, limitar y prepaginar con docInicial    
            cursorQueryRef = cursorQueryRef.orderBy("arrayNormal", "asc");
            cursorQueryRef = cursorQueryRef.limit(BhFilter.limit);  // 
            if (BhFilter.typePaginate == ETypePaginate.Single || BhFilter.typePaginate == ETypePaginate.Full) {
                cursorQueryRef = cursorQueryRef.startAfter(BhFilter.startDoc);                    
            }    
            //================================================================
    
            return cursorQueryRef;
        };

        this.configHandlerForNewQuery$(keyHandler, filter);
        return

    }   
    //------------------------------------------------------------------------------------------------------------------------------
    //================================================================================================================================
    /*paginate$() @Override*/
    //Se debe declarar si se necesita implementar 
    //alguna funcion personalizada
    
    /*populate$() @Override*/
    //Se debe declarar si se necesita implementar 
    //alguna funcion personalizada

    /*pagitanePopulate() @Override*/
    //Se debe declarar si se necesita implementar 
    //alguna funcion personalizada

    //================================================================================================================================    
    /*create*/
    //permite la creacion de un doc en tipo set
    //Parametros:
    //
    //newDoc:
    //el doc a crear
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public create(newDoc: Producto, path_EmbBase?:string): Promise<void> {

        return super.create(newDoc, path_EmbBase);
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
    //isStrongUpdate:
    //determina si se REEMPLAZAN los campos map_ y mapA_
    //o no se modifican
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public update(updatedDoc: Producto, isStrongUpdate = false, path_EmbBase?:string): Promise<void> {

        return super.update(updatedDoc, isStrongUpdate, path_EmbBase);
    }

    //================================================================
    /*delete*/
    //permite la eliminacion de un doc por medio del _id
    //Parametros:
    //
    //_id:
    //estring con id a eliminar
    //
    public delete(_id: string, path_EmbBase?:string): Promise<void> {

        return super.delete(_id, path_EmbBase);
    }

    //================================================================
    /*createDocsTest()*/  
    // permite crear hasta 10 documentos para hacer pruebas
    private createDocsTest(isActived=false){
        if(isActived){   
            //tiempo de espera para que firestore este listo
            const t = 100;      
            setTimeout(() => {

                let docsTest :Producto[] = [];

                for (let i = 0; i < 10; i++) {
                    docsTest[i] = this._Util.createModel();
                }
                
                docsTest[0].nombre = "carro";
                docsTest[0].precio = 100;
                docsTest[0].categoria = "terrestre";
    
                docsTest[1].nombre = "barco";
                docsTest[1].precio = 200;
                docsTest[1].categoria = "maritimo";
                
                docsTest[2].nombre = "helicoptero";
                docsTest[2].precio = 300;
                docsTest[2].categoria = "aereo";       
                
                docsTest[3].nombre = "transportador";
                docsTest[3].precio = 500;
                docsTest[3].categoria = "espacial";   

                this.createDocsTestByTime(docsTest);
        
            }, t); 
        }
    }

}
//================================================================================================================================


