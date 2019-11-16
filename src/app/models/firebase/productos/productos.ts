//================================================================================================================================

import { IUtilCampo, _Util, IConfigFiltroLectura } from "../_util";

//================================================================================================================================
//se crea el modelo de datos que se utilizara para la el servicio correspondiente
//ya que es atraves de firebase, es claro que tanto en angular como en la consola 
// de firebase (especificamente en su base de datos) se debe crear las estructuras 
// de los datos

//la estructura del modelo se basa en dos opciones 
//la debilmente tipada y la fuertemente tipada
//
//la debilmente tipada es en la que se declaran las interfaces y se usara en 
//declaraciones que solo requiera la referencia a los campos (donde no importe el tipo)
//en esta opcion TODOS los campos de la interfaces seran OPCIONALES con el fin de dar 
//mayor flexibilidad y su TIPO será any
//
//la fuertemente tipada es en la que se declaran las clases (NO PUEDEN TENER CONSTRUCTOR 
//NI NINGUN METODO) y se usaran para cuando se requiera crear objetos (inclusive 
//instanciarlos) que necesiten un fuerte tipado, los campos deben tener su respectivo
//tipo y no pueden ser opcionales (excepto los especiales como los virtuales   v_   y 
//otros que se definan como especiales )

//Formato para los campos:
// _id -> contiene el _id personalizado para cada documento de firebase
//        el formato del id es :  n-xxxxxxxxxxxxxxxx   donde n es el orderKey
//         y   x  es el hexa del codigo uuid generado  (solo se usa en Interfaz de nivel coleccion)
//v_  ->  prefijo para campos que son virtuales (NO se almacenan en la BD)
//map_  -> prefijo para campos de tipo   map   sencillos
//mapA_  -> prefijo para campos de tipo  Array de map
//          IMPORTANTE: los campos array o  array de maps no pueden ser consultados 
//          ni editados  item a item, por lo tanto se acondeja a usar para almacenar 
//          informacion poco procesable
//emb_  ->  prefijo para campos de subColeccion   (embebidos)  

//================================================================================================================================
//================================================================================================================================
//Seccion interfaces:
export interface IProducto{
    _id? : any;  //_id personalizado creado por el modulo uuid
    _pathDoc? : any; //RECORDAR: este path debe apuntar a un documento (Formato PAR:  "/coleccion/_id/subcoleccion/_id....")

    nombre? : any
    precio? : any;
    categoria? : any;
    map_miscelanea? : any; 
    mapA_misc?: any;

    v_precioImpuesto?:any;

}

export interface IMap_miscelanea{
    tipo? : any;
    ruedas? : any;
}

export interface IMapA_misc{
    color?:any;
}

//================================================================
//interfaz especial para el filtrado de datos (usando observables)
//todo objeto que haga referencia a filtrado termina en   $  
//esta extendida a la interfaz IConfigFiltro<TIModelo, TModelo, TIFiltro>
//la cual contiene las propiedades basicas para filtrar
//ademas en la propiedad filtroValores se le puede asignar campos de filtrado
//personalizados como por ejemplo: 
//filtroValores:{ rangoMaximo:number, rangoMinimo:number, etc }

export interface IProducto$ extends IConfigFiltroLectura<IProducto, Producto, IProducto$>{
    //...aqui cualquier filtrado especial que se requiera...
    filtroValores?:{
        //...aqui colocar campos que almacenan valores para el filtro...
        // rangos, comparaciones y demas.
    };

}

//================================================================
//Interfaces especiales para implementar contenedores de 
//objetos utilitarios para los metodos Pre  
//deben llevar el sufijo   _Modelo   del moedelo para no generar 
//conflictos con otras colecciones cuando se haga   import
//    Iv_utilesPreLeer{aqui el sufijo de coleccion}
export interface Iv_PreLeer_Productos{
    imp:number;  //--solo para ejemplo---
}

export interface Iv_PreModificar_Productos{

    propiedades?:{

    }

    config:{
        //================================
        //atributos SOLO para la creacion
        isCrear:boolean;
        orderIDKey?:number;
        pathColeccion?:string;   
        //================================
        //Atributos SOLO para la edicion
        isEditadoFuerte?:boolean;       
    };

}
//================================================================
//================================================================================================================================
//================================================================================================================================
//Seccion Clases
//en la declaracion de clases si se especifica el tipo para cada campo 
//es muy recomendable que cada propiedad este inicializada
//no es recomendable que tenga algun metodo

//RECORDAR:
//en las clases todos los campos deben tener su correspondiente tipo
//NO DEBEN SER OPCIONALES (excepto los virtuales y especiales que no se 
//almacenen en la BD)

export class Producto implements IProducto {
    _id : string =""; //se asignará dinamicamente
    _pathDoc:string =""; //se asignará dinamicamente

    nombre : string ="";
    precio : number = 0;
    categoria : string = "";
    map_miscelanea : Map_miscelanea = new Map_miscelanea(); 
    mapA_misc: MapA_misc[] =[];

    v_precioImpuesto?: number = 0;
}

export class Map_miscelanea implements IMap_miscelanea{
    tipo : string = "";
    ruedas : number = 0;
}

export class MapA_misc implements IMapA_misc{
    color:string = "";
}
//================================================================================================================================
//Seccion Clase Utilitaria
//Solo se requiere una clase utilitaria por coleccion 
//se debe tener en cuenta activar en cada campo TODAS las banderas 
//necesarias que  dan caracteristicas a dicho campo

//================================================================
//Clase_Utilidades que implementa la interfaz para obtener las 
//propiedades respectivas y asi agregarles utilidades como validaciones,
//html, y demas funcinalidades extra
//IMPORTANTE: en esta clase si se deberia agregar metodos y demas funcionalidades

export class Producto_Util extends _Util implements IProducto {

    //================================================================
    //atributos para cada campo:
    _id:IUtilCampo<any> = {
        nom:"_id",
    };
    _pathDoc:IUtilCampo<any> = {
        nom:"_pathDoc",
    };

    nombre:IUtilCampo<any> = {
        nom : "nombre",
        isRequerido:true
    };
    precio:IUtilCampo<any> = {
        nom:"precio",
        isRequerido:true
    };
    categoria:IUtilCampo<any> = {
        nom:"categoria"
    };
    map_miscelanea:IUtilCampo<IMap_miscelanea> ={
        nom:"map_miscelanea",
        isMap:true,
        util:{
            tipo:<IUtilCampo<any>>{
                nom : "tipo"
            },
            ruedas:<IUtilCampo<any>>{
                nom : "ruedas"
            }
        },

    }; 
    mapA_misc:IUtilCampo<IMapA_misc> ={
        nom : "mapA_misc",
        isMap : true,
        isArray : true,
        util : {
            color : <IUtilCampo<any>> {
                nom : "color",
            }
        }
    }; 

    v_precioImpuesto:IUtilCampo<any> = {
        nom:"v_precioImpuesto",
        isVirtual:true
    }    
    //================================================================

    constructor() {
        super();
    }
    //================================================================
    //obtener el nombre de la coleccion o subcoleccion SIN PATH
    public getNomColeccion():string{
        return "Productos";
    }    
    //================================================================
    //================================================================
    //obtener el path de la coleccion o subcoleccion
    //pathBase ->  path complemento para construir el el path completo
    //             util para las subcolecciones
    public getPathColeccion(pathBase?:string):string{
        //----------------[EN CONSTRUCCION]----------------
        if (pathBase  && pathBase != "") {
            return `/${pathBase}/${this.getNomColeccion()}`;
        }else{
            return `/${this.getNomColeccion()}`;
        }
        //------------------------------------------------

    }    
    //================================================================
    //================================================================
    //metodo que debe ejecutarse antes de crear o actualizar un documento
    //Parametros:
    //doc -> el documento que se desea crear o actualizar
    //v_utilesPreMod ->  objeto que contiene datos para enriqueser o realizar operaciones
    //                   de acuerdo a la coleccion (determinar si se crea o se actualiza, generar _ids y )

    public preCrearOActualizar(doc:Producto, v_utilesPreMod:Iv_PreModificar_Productos):Producto{
        //================================================================
        //se determina si se desea crear el documento para su configuracion
        if (v_utilesPreMod.config.isCrear) {
            //================================================================
            //aqui se genera el nuevo _id a guardar
            if ( v_utilesPreMod.config.orderIDKey >= 0 && v_utilesPreMod.config.orderIDKey != null) {
                doc._id = this.generarIds(v_utilesPreMod.config.orderIDKey);          
            }else{
                //este codigo es solo en el MUY POCO PROBABLE caso que no se 
                //tenga un  _orderKey  y sin embargo se quiera crear el objeto
                doc._id = this.generarIds(0);
            }                 
            //================================================================
            //================================================================
            //aqui se genera el   _pathDoc   del documento a crear
            //en un eventual caso que no se reciba el  v_utilesPreModificar._pathColeccion
            //se usa como ultimo recurso un   path   raiz (se tendria problemas para las subcolecciones)
            doc._pathDoc = `${v_utilesPreMod.config.pathColeccion || this.getNomColeccion()}/${doc._id}`;
            //================================================================
        }
        //----------------[EN CONSTRUCCION]----------------
        
        //------------------------------------------------
        //================================================================
        //aqui se formatean los datos del documento (se quitan campos 
        //inecesarios (no almacenables))
        doc = this.formatearDoc<Producto, Producto_Util>(doc, this, v_utilesPreMod.config.isEditadoFuerte);
        //================================================================                               
        return doc;       
    }

    //================================================================
    //metodo que debe ejecutarse antes de entregar la lectura de documentos
    //al correspondiente componente, esta metodo se ejecuta en CADA 
    //DOCUMENTO LEIDO (documento por documento)
    //Parametros:
    //docs ->  documento o documentos que se leyeron de firebase
    //v_utilesPreLeer-> objeto que contiene datos para enriqueser o realizar operaciones
    //          (por ejemplo cargar los campos virtuales) antes de entregar a
    //          la vista o componente correspondiente
    public preLeerDocs(docs:Producto[] | Producto, v_utilesPreLeer:Iv_PreLeer_Productos):Producto[] | Producto{

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

        //retornar doc ya formateado
        return docs;
    }

    //================================================================
    //configurar un filtro inicial para la lectura
    // public configurarFiltro():IProducto$ {
    //     let filtro = <IProducto$>{

    //     };
    //     return filtro;
    // }
        

}


