import { IRol, Rol} from '../../../models/firebase/rol/rol';
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

export class Rol_Meta extends Model_Meta implements IRol<any>, IMetaColeccion {

    //================================================================
    /*metadata estatica:*/
    //metadata referente a coleccion
    __nomColeccion: string = nomsColecciones.Roles;
    __nomPathColeccion: string = "";
    __isEmbSubcoleccion: boolean = false;

    //metadata referente a campos:

    _id:IMetaCampo<string, any> = {
        nom:"_id",
        default:"",
    };
    _pathDoc:IMetaCampo<string, any> = {
        nom:"_pathDoc",
        default:"",
    };
    
    //codigo de Roles Pre configurados:
    //invitado = 10**1
    //empleado = 10**2
    //administrador = 10**3
    //programador = 10**8
    codigo:IMetaCampo<number, any> = {
        nom : "codigo",
        //este valor default es el exponente 
        //se le asigna la potencia en el constructor 
        default:1, 
        isRequerido:true,
        maxFactorIgualdadQuery:1,
        expFactorRedondeo:null,
    };
    strCodigo:IMetaCampo<string, any> = {
        nom:"strCodigo",
        default:"invitado"
    };

    emb_Permisos: IMetaCampo<any, any>= {
        nom:"emb_Permisos",
        default : undefined,
        isEmbebido : true,
    };

    //metadata utilitaria todas dentro de __Util:
    __Util = {
        //contiene la base para potencia
        //de los codigos de rol
        baseCodigo : 10,
        
        //determina si un rol tiene la capacidad
        // de crear roles de su mismo nivel
        isRolCreaRol:true
    };

    //keyHandlers$ foraneos:  

    //================================================================
    constructor(
        
    ) {
        super();
        //potencia para codigo de rol por default
        this.codigo.default = this.codigo.default ** this.__Util.baseCodigo;
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

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
