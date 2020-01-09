import { IUsuario, Usuario } from '../../../models/firebase/usuario/usuario';
import { IMetaColeccion, IMetaCampo, nomsColecciones } from '../meta_Util';

//================================================================
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

export class UsuarioCtrl_Util implements IUsuario<any>, IMetaColeccion {
    __nomColeccion: string;
    __nomPathColeccion: string;
    __isEmbSubcoleccion: boolean;

    _id:IMetaCampo<string, any>;
    _pathDoc:IMetaCampo<string, any>;
    nombre:IMetaCampo<string, any>;
    apellido:IMetaCampo<string, any>;
    edad:IMetaCampo<string, any>;
    fk_rol:IMetaCampo<string, any>;

    constructor() {

        //metadata referente a coleccion
        this.__nomColeccion = nomsColecciones.Usuarios;
        this.__nomPathColeccion = "";
        this.__isEmbSubcoleccion = false;

        //metadata referente a campos:
        this._id = {
            nom:"_id",
            default:"",
        };
        this._pathDoc = {
            nom:"_pathDoc",
            default:"",
        };
    
        this.nombre = {
            nom : "nombre",
            default:"",
            isRequerido:true,
        };
        this.apellido = {
            nom:"apellido",
            default:"",
            isRequerido:true,
        };
    
        this.edad = {
            nom:"edad",
            default:"",
            isRequerido:true
        }
    
        this.fk_rol = {
            nom:"fk_rol",
            default:"",
            isRequerido:true,
            // typeSelect:"unica",
            // selectList:
        }

    }

}
//================================================================================================================================
/*Clases _Meta para campo especiales (map_ y mapA_)*/
//estas clases no requieren metadata de coleccion

//================================================================================================================================
