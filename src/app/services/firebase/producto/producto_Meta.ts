import { IProducto, Producto, Map_miscelanea, MapA_misc, IMap_miscelanea, IMapA_misc } from '../../../models/firebase/producto/producto';
import { IMetaColeccion, IMetaCampo, nomsColecciones, Model_Meta } from '../meta_Util';


//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
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

export class Producto_Meta extends Model_Meta implements IProducto<any>, IMetaColeccion {

    //================================================================
    /*metadata estatica:*/
    //metadata referente a coleccion
    __nomColeccion: string = nomsColecciones.Productos;
    __nomPathColeccion: string = "";
    __isEmbSubcoleccion: boolean = false;

    //metadata referente a campos:    
    _id: IMetaCampo<string, any> = {
        nom: "_id",
        default: "",
    };
    _pathDoc: IMetaCampo<string, any> = {
        nom: "_pathDoc",
        default: "",
    };
    nombre: IMetaCampo<string, any> = {
        nom: "nombre",
        default: "",
        isRequerido: true,
    };
    precio: IMetaCampo<number, any> = {
        nom: "precio",
        default: 0,
        isRequerido: true,
        maxFactorIgualdadQuery: 1,
        expFactorRedondeo: null,
    };
    categoria: IMetaCampo<string, any> = {
        nom: "categoria",
        default: "",
    };;
    map_miscelanea: IMetaCampo<Map_miscelanea, Map_miscelanea_Meta> = {
        nom: "map_miscelanea",
        default: new Map_miscelanea(),
        isMap: true,
        extMeta: new Map_miscelanea_Meta(),

    };
    mapA_misc: IMetaCampo<MapA_misc[], MapA_misc_Meta>
    emb_SubColeccion: IMetaCampo<any, any> = {
        nom: "emb_SubColeccion",
        default: undefined,
        isEmbebido: true,
    };
    v_precioImpuesto: IMetaCampo<number, any> = {
        nom: "v_precioImpuesto",
        default: 0,
        isVirtual: true,
    };

    //metadata utilitaria todas dentro de __Util:
    __Util = {

    };

    //keyHandlers$ foraneos:  

    //================================================================
    constructor() {
        super();
    }
    //================================================================
    /*export_meta__keyHadlersOrPathHandlers$()*/
    //exporta todas las keys handlers o pathhandlers usadas por este meta
    public export_meta__keyHadlersOrPathHandlers$():string[]{        
        //aqui TODOS los services en el contenedor de retorno
        return [            

        ];
    }

}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*Clases _Meta para campo especiales (map_ y mapA_)*/
//estas clases no requieren metadata de coleccion
export class Map_miscelanea_Meta extends Model_Meta implements IMap_miscelanea<any>{

    //================================================================
    /*metadata estatica:*/
    //metadata referente a coleccion
    ruedas: IMetaCampo<number, any> = {
        nom: "ruedas",
        nomMapPath: "map_miscelanea.ruedas",
        default: 2,
        maxFactorIgualdadQuery: 1,
        expFactorRedondeo: null
    };

    tipo: IMetaCampo<string, any> = {
        nom: "tipo",
        nomMapPath: "map_miscelanea.tipo",
        default: "",
    };

    //metadata utilitaria todas dentro de __Util:
    __Util = {

    };

    //================================================================
    constructor() {
        super();
    }
    
    //================================================================
    /*export_meta__keyHadlersOrPathHandlers$()*/
    //exporta todas las keys handlers o pathhandlers usadas por este meta
    public export_meta__keyHadlersOrPathHandlers$():string[]{        
        //aqui TODOS los services en el contenedor de retorno
        return [            

        ];
    }
}
//████████████████████████████████████████████████████████████████
export class MapA_misc_Meta extends Model_Meta implements IMapA_misc<any>{

    //================================================================
    /*metadata estatica:*/
    //metadata referente a coleccion
    color: IMetaCampo<string, any> = {
        nom: "color",
        nomMapPath: "map_miscelanea.color", //por ahora, no sirve en array
        default: "blanco"
    };

    //metadata utilitaria todas dentro de __Util:
    __Util = {

    };

    //================================================================
    constructor() {
        super();
    }

    //================================================================
    /*export_meta__keyHadlersOrPathHandlers$()*/
    //exporta todas las keys handlers o pathhandlers usadas por este meta
    public export_meta__keyHadlersOrPathHandlers$():string[]{        
        //aqui TODOS los services en el contenedor de retorno
        return [            

        ];
    }
}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

