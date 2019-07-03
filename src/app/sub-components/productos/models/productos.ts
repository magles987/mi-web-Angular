//================================================================================================================================
//se crea el modelo de datos que se utilizara para la el servicio correspondiente
//ya que es atraves de firebase, es claro que tanto en angular como en la consola 
// de firebase (especificamente en su base de datos) se debe crear las estructuras 
// de los datos
//================================================================================================================================

import { IUtilCampo, _Util } from "../../../models/_util";

//================================================================================================================================
//================================================================================================================================
//Seccion interfaces:
//aqui se declaran las interfaces tanto de la  coleccion    como los campos de 
//tipo  maps   que se valla a utilizar 

//Formato para los campos:
// _id -> contiene el _id personalizado para cada documento de firebase
//        el formato del id es :  n-xxxxxxxxxxxxxxxx   donde n es el orderKey
//         y   x  es el hexa del codigo uuid generado  (solo se usa en Interfaz de nivel coleccion)
//v_ ? ->  prefijo para campos que son virtuales (NO se almacenan en la BD) y deben ser opcionales
//map_  -> prefijo para campos de tipo   map   sencillos
//mapA_  -> prefijo para campos de tipo  Array de map
//emb_  ->  prefijo para campos de subColeccion   (embebidos)  

//TODOS los campos de las interfaces son de tipo  any  , la interfaz solo se usa 
//para declarar los campos a usar y ayudar con el intellicense de VScode

export interface IProducto{
    _id : any;

    nombre : any
    precio : any;
    categoria : any;
    map_miscelanea : any; 
    mapA_misc: any;

    v_precioImpuesto?:any;
}

export interface IMap_miscelanea{
    tipo : any;
    ruedas : any;
}

export interface IMapA_misc{
    color:any;
}
//================================================================================================================================
//================================================================================================================================
//Seccion Clases
//en la declaracion de clases si se especifica el tipo para cada campo 
//La clase NO DEBE TENER CONSTRUCTOR, ni ninguna funcion 
export class Producto implements IProducto {
    _id : string;

    nombre : string;
    precio : number;
    categoria : string;
    map_miscelanea : Map_miscelanea; 
    mapA_misc: MapA_misc[];

    v_precioImpuesto?: number;
}

export class Map_miscelanea implements IMap_miscelanea{
    tipo : string;
    ruedas : number;
}

export class MapA_misc implements IMapA_misc{
    color:string;
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
    nombre:IUtilCampo<any> = {
        nom : "nombre"
    };
    precio:IUtilCampo<any> = {
        nom:"precio"
    };
    categoria:IUtilCampo<any> = {
        nom:"categoria"
    };
    map_miscelanea:IUtilCampo<IMap_miscelanea> ={
        nom:"map_miscelanea",
        isMap:true,
        util:{
            tipo:<IUtilCampo<any>>{
                nom : "tipo",
            },
            ruedas:<IUtilCampo<any>>{
                nom : "ruedas",
            }
        }
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
        if (!pathBase) {
            return `${this.getNomColeccion()}/`;
        }else{
            return `${pathBase}/${this.getNomColeccion()}/`;
        }
        //------------------------------------------------

    }    
    //================================================================
    //================================================================
    //metodo que debe ejecutarse antes de crear o actualizar un documento
    //Parametros:
    //doc -> el documento que se desea crear o actualizar
    //_orderKey->  numero para el control del orden de los _ids 
    //             (SOLO CUANDO SE CREA un documento) 
    public preCrearOActualizar(doc:Producto, _orderKey?:number):Producto{
        //================================================================
        //se determina si se crea o actualiza dependiendo
        // si se recibió el    _orderKey
        if ( _orderKey >= 0 ) {
            //================================================================
            //aqui se genera el nuevo _id a guardar
            doc._id = this.generarIds(_orderKey);
            //================================================================            
        } 
        //----------------[EN CONSTRUCCION]----------------
        
        //------------------------------------------------
        //================================================================
        //aqui se formatean los datos del documento (se quitan campos 
        //inecesarios (no almacenables))
        doc = this.formatearDoc<Producto, Producto_Util>(doc, this);
        //================================================================                               
        return doc;       
    }

    //================================================================
    //
    
    //================================================================
    //metodo que debe ejecutarse antes de lentregar la lectura de documentos
    //al correspondiente componente, esta metodo se ejecuta por CADA 
    //DOCUMENTO leido
    //Parametros:
    //doc ->  documento que se obtubo de firebase
    //V-camp -> objeto que contiene datos para enriqueser o realizar operaciones
    //          (por ejemplo cargar los campos virtuales) antes de entregar a
    //          la vista o componente correspondiente
    //          se recomienda en el tipo  agregar la interfaz anonima que se desea recibir
    //          como ejemplo  v_camp?:{imp:number}   donde   {imp:number} es la interfaz anonima
    public preLeer(doc:Producto, v_camp?:{imp:number}):Producto{

        doc.v_precioImpuesto = ((doc.precio * v_camp.imp)/100) + doc.precio;

        return doc;
    }

}

//================================================================

