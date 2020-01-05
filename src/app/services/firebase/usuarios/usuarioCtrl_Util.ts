import { IUsuario, Usuario } from '../../../models/firebase/usuarios/usuario';
import { Ctrl_Util, IUtilCampo, IValQ } from '../_Util';
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
export interface Iv_PreLeer_Usuario{

}

/*Iv_PreModificar_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades externar al modelo (mas especificamente IModelo) 
//para realizar calculos o enriquecer el doc a modificar (ya sea crear o editar) 
export interface Iv_PreModificar_Usuario{

}

/*IValQ_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades personalizadas para este modelo_util para 
//construir querys personalizadas y especificas
export interface IValQ_Usuario extends IValQ{

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

export class UsuarioCtrl_Util extends Ctrl_Util<Usuario, IUsuario<any>, UsuarioCtrl_Util> 
                               implements IUsuario<any> {

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
                const util = new UsuarioCtrl_Util();
                const c_util = util.nombre;
                val = val.trim();                
            }
            return val
        },
    };
    apellido:IUtilCampo<string, any> = {
        nom:"apellido",
        isRequerido:true,
        formateoCampo:(val)=>{
            if (val && val != null) {
                const util = new UsuarioCtrl_Util();
                const c_util = util.nombre;
                val = val.trim();                
            }
            return val
        },
    };

    edad:IUtilCampo<string, any> = {
        nom:"edad",
        isRequerido:true
    }

    fk_rol:IUtilCampo<string, any> = {
        nom:"fk_rol",
    }
    //================================================================

    constructor() {
        super();
    }

    //================================================================
    /*getModelo*/
    //aqui se obtiene la instancia del modelo con los campos inicializados
    //aunque se puede inicializar directamente desde la clase donde se 
    //declara el modelo, aqui puedo enriquecer la inicializacion 
    //con ayuda de los campos_util
    public getModelo():Usuario{
        let M = new Usuario();
        M._id = ""; //se inicializa justo antes de guardar en Firestore
        M._pathDoc="";//se inicializa justo antes de guardar en Firestore

        M.nombre="";
        M.apellido="";
        M.edad="0";
        M.fk_rol="";

        return M;
    }
    //================================================================
    /*getNomColeccion()*/
    //obtener el nombre de la coleccion o subcoleccion SIN PATH
    public getNomColeccion():string{
        return "Usuarios";
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

    public preCrearOActualizar(doc:Usuario,
                                isCrear:boolean=true,
                                isEditadoFuerte=false, 
                                v_PreMod?:Iv_PreModificar_Usuario,
                                path_EmbBase?:string,
                                _idExterno?:string 
                              ):Usuario{
        
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
    public preLeerDocs(docs:Usuario[] | Usuario, v_utilesPreLeer:Iv_PreLeer_Usuario):Usuario[] | Usuario{

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
