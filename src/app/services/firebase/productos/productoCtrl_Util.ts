import { IProducto, Producto, IMap_miscelanea, IMapA_misc } from '../../../models/firebase/productos/producto';
import { Ctrl_Util, IUtilCampo, IValQ } from '../_Util';

//================================================================================================================================
/*INTERFACES especiales para cada Modelo_util*/
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
    public preCrearOActualizar(doc:Producto,
                                isCrear:boolean=true,
                                isEditadoFuerte=false, 
                                v_PreMod?:Iv_PreModificar_Producto,
                                path_EmbBase?:string,
                                _idExterno?:string 
                              ):Producto{
        
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
    };
}

//================================================================================================================================
