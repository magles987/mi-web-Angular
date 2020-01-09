import { Iemb_Permiso, emb_Permiso } from '../../../models/firebase/rol/emb_Permiso';
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

export class emb_Permiso_Meta implements Iemb_Permiso<any>, IMetaColeccion {

    __nomColeccion: string;
    __nomPathColeccion: string;
    __isEmbSubcoleccion: boolean;

    nomColeccion:IMetaCampo<string, any>;
    read: IMetaCampo<number, any>;
    create: IMetaCampo<number, any>;
    update: IMetaCampo<number, any>;
    delete: IMetaCampo<number, any>;

    selfRead: IMetaCampo<number, any>;
    selfCreate: IMetaCampo<number, any>;
    selfUpdate: IMetaCampo<number, any>;
    selfDelete: IMetaCampo<number, any>;    

    constructor(){

        //metadata referente a coleccion
        this.__nomColeccion = nomsColecciones.emb_Permisos;
        this.__nomPathColeccion = "";
        this.__isEmbSubcoleccion = true;

        //metadata referente a campos:
        this.nomColeccion = {
            nom:"nomColeccion",
            default:"",
            isRequerido:true,
            typeSelect:"unica",
            selectList: Object.values(nomsColecciones) //convierte las propiedades de un objeto a un array nomsPropiedades        
        };
        this.read = {
            nom:"read",
            default:0,
            maxFactorIgualdadQuery:1,
            
        };
        this.create = {
            nom:"create",
            default:0,
            maxFactorIgualdadQuery:1,
            
        };
        this.update = {
            nom:"update",
            default:0,
            maxFactorIgualdadQuery:1,
            
        };
        this.delete = {
            nom:"delete",
            default:0,
            maxFactorIgualdadQuery:1,
            
        };
        this.selfRead = {
            nom:"selfRead",
            default:0,
            maxFactorIgualdadQuery:1,
            
        };
        this.selfCreate = {
            nom:"selfCreate",
            default:0,
            maxFactorIgualdadQuery:1,
            
        };
        this.selfUpdate = {
            nom:"selfUpdate",
            default:0,
            maxFactorIgualdadQuery:1,
            
        };
        this.selfDelete = {
            nom:"selfDelete",
            default:0,
            maxFactorIgualdadQuery:1,
            
        };
    }
 
}
//================================================================================================================================
/*Clases _Meta para campo especiales (map_ y mapA_)*/
//estas clases no requieren metadata de coleccion

//================================================================================================================================
