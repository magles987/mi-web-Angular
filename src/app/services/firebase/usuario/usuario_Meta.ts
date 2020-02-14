import { IUsuario, Usuario } from '../../../models/firebase/usuario/usuario';
import { IMetaColeccion, IMetaCampo, nomsColecciones } from '../meta_Util';

import { IRunFunSuscribe } from '../fs_Model_Service';

import { Rol } from 'src/app/models/firebase/rol/rol';
import { Rol_Meta } from '../rol/rol_Meta';

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

export class Usuario_Meta implements IUsuario<any>, IMetaColeccion {

    //================================================================
    /*metadata estatica:*/
    //metadata referente a coleccion
    __nomColeccion: string = nomsColecciones.Usuarios;
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
    apellido: IMetaCampo<string, any> = {
        nom: "apellido",
        default: "",
        isRequerido: true,
    };
    edad: IMetaCampo<string, any> = {
        nom: "edad",
        default: "",
        isRequerido: true
    };
    fk_rol: IMetaCampo<string, any> = {
        nom: "fk_rol",
        default: "",
        isRequerido: true,
        typeSelect: "unica",
        selectList: []
    };

    //metadata utilitaria todas dentro de __Util:
    __Util = {
        codigoRolActual:0
    };

    //================================================================
    /*metadata dinamica:*/
    //son propiedades-funcion RFS que se le asignaran a los respectivos 
    //controls_ext$ para cargar y monitorear dinamicamente la metadata
    RFS_rol:IRunFunSuscribe<Rol> = {
        next:(roles:Rol[])=>{

            this.fk_rol.selectList = [];
            
            const rol_m = new Rol_Meta();

            roles.forEach(element => {
                this.fk_rol.selectList.push(element._pathDoc);
                if (element.codigo <= rol_m.__Util.baseCodigo) {
                    this.fk_rol.default = element._pathDoc;
                }
            });

            this.__Util.codigoRolActual = roles[roles.length-1].codigo;
        },
        error:(err)=>{}
    }

    //================================================================
    constructor() {

    }
   
    //================================================================
}
//================================================================================================================================
/*Clases _Meta para campo especiales (map_ y mapA_)*/
//estas clases no requieren metadata de coleccion

//================================================================================================================================
