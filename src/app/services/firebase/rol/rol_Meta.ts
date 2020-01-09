import { IRol, Rol} from '../../../models/firebase/rol/rol';
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

export class Rol_Meta  implements IRol<any>, IMetaColeccion {

    __nomColeccion: string;
    __nomPathColeccion: string;
    __isEmbSubcoleccion: boolean;

    _id:IMetaCampo<string, any>;
    _pathDoc:IMetaCampo<string, any>;
    codigo:IMetaCampo<number, any>;
    strCodigo:IMetaCampo<string, any>;

    emb_Permisos: IMetaCampo<any, any>;

    constructor() {

        //metadata referente a coleccion
        this.__nomColeccion = nomsColecciones.Roles;
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

        //codigo de Roles Pre configurados:
        //invitado = 10^1
        //empleado = 10^2
        //administrador = 10^6
        //programador = 10^8
        this.strCodigo = {
            nom:"strCodigo",
            default:"invitado"
        }

        this.codigo = {
            nom : "codigo",
            default:10^1,
            isRequerido:true,
            maxFactorIgualdadQuery:1,
            expFactorRedondeo:null,
        };

        this.emb_Permisos = {
            nom:"emb_Permisos",
            default : undefined,
            isEmbebido : true,
        }

    }
 
}
//================================================================================================================================
/*Clases _Meta para campo especiales (map_ y mapA_)*/
//estas clases no requieren metadata de coleccion

//================================================================================================================================
