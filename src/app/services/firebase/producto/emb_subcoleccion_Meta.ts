import { Iemb_SubColeccion, emb_SubColeccion } from '../../../models/firebase/producto/emb_subColeccion';
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

export class emb_SubColeccion_Meta extends Model_Meta implements Iemb_SubColeccion<any>, IMetaColeccion {

    //================================================================
    /*metadata estatica:*/
    //metadata referente a coleccion    
    __nomColeccion: string= nomsColecciones.emb_SubColeccion;;
    __nomPathColeccion: string= "";
    __isEmbSubcoleccion: boolean = true;

    //metadata referente a campos:    
    _id:IMetaCampo<string, any>= {
            nom:"_id",
            default:"",
        };
    _pathDoc:IMetaCampo<string, any>= {
            nom:"_pathDoc",
            default:"",
        };
    subCampo1:IMetaCampo<string, any>= {
            nom : "subCampo1",
            default:"",
            isRequerido:true,
        };
    subCampo2:IMetaCampo<string, any>= {
            nom : "subCampo2",
            default:"",
            isRequerido:true,
        };   

    //metadata utilitaria todas dentro de __Util:
    __Util = {

    };    

    //================================================================
    constructor() {
        super();
    }

}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*Clases _Meta para campo especiales (map_ y mapA_)*/
//estas clases no requieren metadata de coleccion

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████


