import { IProducto, Producto, Map_miscelanea, MapA_misc, IMap_miscelanea, IMapA_misc } from '../../../models/firebase/producto/producto';
import { IMetaColeccion, IMetaCampo, nomsColecciones } from '../meta_Util';

//================================================================================================================================
/*{Modelo}_Meta*/
//las clases _Meta que implementa la interfaz IModelo proporcionan
//funciones y utilidades enfocadas al manejo de los controllers 
//o services de cada modelo, entre sus funcionalidades estan:
//validaciones,formateo (el formateo por ahora no esta implementado), nom, 
//selecciones entre otros y se enfoca en atomizar dichas funcionalidades
//para cada campo o en conjunto para 
//todo el modelo
//
//IMPORTANTE: en esta clase si se deberia agregar metodos y demas funcionalidades

export class Producto_Meta implements IProducto<any>, IMetaColeccion {

    __nomColeccion:string;
    __nomPathColeccion:string;
    __isEmbSubcoleccion: boolean;

    _id:IMetaCampo<string, any>;
    _pathDoc:IMetaCampo<string, any>;
    nombre:IMetaCampo<string, any>;
    precio:IMetaCampo<number, any>;
    categoria:IMetaCampo<string, any>;
    map_miscelanea:IMetaCampo<Map_miscelanea, Map_miscelanea_Meta>;
    mapA_misc:IMetaCampo<MapA_misc[], MapA_misc_Meta>
    emb_SubColeccion:IMetaCampo<any, any>;
    v_precioImpuesto:IMetaCampo<number, any>;

    constructor() {

        //metadata referente a coleccion
        this.__nomColeccion = nomsColecciones.Productos;
        this.__nomPathColeccion = "";
        this.__isEmbSubcoleccion = false;

        //metadata referente a campos:
        this._id = {
            nom:"_id",
            default:"",          
        }

        this._pathDoc = {
            nom:"_pathDoc",
            default:"",
        }

        this.nombre = {
            nom:"nombre",
            default:"",
            isRequerido:true,
        };
        
        this.precio = {
            nom:"precio",
            default:0,
            isRequerido:true,
            maxFactorIgualdadQuery : 1,
            expFactorRedondeo:null,
        };
        this.categoria = {
            nom:"categoria",
            default:"",
        };
        this.map_miscelanea = {
            nom:"map_miscelanea",
            default: new Map_miscelanea(),
            isMap:true,
            extMeta:new Map_miscelanea_Meta(),

        }; 
        this.mapA_misc = {
            nom:"mapA_misc",
            default:[],
            isMap:true,
            isArray:true,
            extMeta:new MapA_misc_Meta(),
        }; 

        this.emb_SubColeccion = {
            nom:"emb_SubColeccion",
            default : undefined,
            isEmbebido : true,
        }

        this.v_precioImpuesto = {
            nom:"v_precioImpuesto",
            default:0,
            isVirtual:true,
        } 

    }
}
//================================================================================================================================
/*Clases _Meta para campo especiales (map_ y mapA_)*/
//estas clases no requieren metadata de coleccion
export class  Map_miscelanea_Meta implements IMap_miscelanea<any>{

    ruedas:IMetaCampo<number, any> ;
    tipo:IMetaCampo<string, any>;

    constructor() {
        //metadata referente a campos:
        this.ruedas = {
            nom:"ruedas",
            nomMapPath: "map_miscelanea.ruedas",
            default:2,
            maxFactorIgualdadQuery : 1,
            expFactorRedondeo : null
        };

        this.tipo = {
            nom:"tipo",
            nomMapPath: "map_miscelanea.tipo",
            default:"",
        };
    }
}

export class  MapA_misc_Meta implements IMapA_misc<any>{

    color:IMetaCampo<string, any>;

    constructor() {
        //metadata referente a campos:
        this.color = {
            nom:"color",
            nomMapPath: "map_miscelanea.color", //por ahora, no sirve en array
            default:"blanco"
        };
    
    }
}

//================================================================================================================================
