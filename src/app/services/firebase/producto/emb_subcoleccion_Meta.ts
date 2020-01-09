import { Iemb_SubColeccion, emb_SubColeccion } from '../../../models/firebase/producto/emb_subColeccion';
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

//================================================================================================================================
export class emb_SubColeccion_Meta implements Iemb_SubColeccion<any>, IMetaColeccion {
    __nomColeccion: string;
    __nomPathColeccion: string;
    __isEmbSubcoleccion: boolean;

    _id:IMetaCampo<string, any>;;
    _pathDoc:IMetaCampo<string, any>;;
    subCampo1:IMetaCampo<string, any>;;
    subCampo2:IMetaCampo<string, any>;;
 
    constructor() {
        
        //metadata referente a coleccion
        this.__nomColeccion = nomsColecciones.emb_SubColeccion;
        this.__nomPathColeccion = "";
        this.__isEmbSubcoleccion = true;

        //metadata referente a campos:
        this._id = {
            nom:"_id",
            default:"",
        };
        this._pathDoc = {
            nom:"_pathDoc",
            default:"",
        };
    
        this.subCampo1 = {
            nom : "subCampo1",
            default:"",
            isRequerido:true,
        };
    
        this.subCampo2 = {
            nom : "subCampo2",
            default:"",
            isRequerido:true,
        };    
     
    }
}
//================================================================================================================================
/*Clases _Meta para campo especiales (map_ y mapA_)*/
//estas clases no requieren metadata de coleccion

//================================================================================================================================

