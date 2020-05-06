import { IUsuario, Usuario } from '../../../models/firebase/usuario/usuario';
import { IMetaColeccion, IMetaCampo, nomsColecciones, Model_Meta } from '../meta_Util';

import { Fs_ModelService } from '../fs_Model_Service';

import { Rol } from 'src/app/models/firebase/rol/rol';
import { RolService, Ifs_FilterRol } from '../rol/rol.service';
import { IRunFunSuscribe } from '../../ServiceHandler$';


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

export class Usuario_Meta extends Model_Meta implements IUsuario<any>, IMetaColeccion {

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

    };

    //keyHandlers$ foraneos:    
    private _keyRolHandler:string; 
    private _keyRolPathHandler:string;

    //================================================================
    constructor(
        private _rolService: RolService
    ) {
        super();

        //cargar los metodos dinamicos:
        this.update_fk_rol();
    }

    /*update_fk_rol()*/
    //
    //Parametros:
    //
    public update_fk_rol(pathRol?:string):void{
        
        const baseCodigo =  this._rolService.Model_Meta.__Util.baseCodigo;
        const isRolCreateRol = this._rolService.Model_Meta.__Util.isRolCreaRol;

        let QValue:Ifs_FilterRol = {
            VQ_LtEqNum : {codigo : baseCodigo}
        };
        
        //crear handlers y declarar RFSs
        if (!this._keyRolHandler || this._keyRolHandler == null) {

            //Funcion de tipo rfs_fk_[campo] que permite
            //actualizar dinamicamente la metadata para este campo 
            const rfs_fk_rol:IRunFunSuscribe<Rol[]> = {
                next:(roles)=>{
                    if (roles && Array.isArray(roles) && roles.length > 0) {

                        //almacena el index del doc que tiene el codigo mas alto
                        let idxCodMax:number = 0;

                        //actualiza todos los meta referente a seleccion multiple
                        this.fk_rol.selectList = [];

                        roles.forEach((doc, idx) => {

                            //buscar el indx del codigo mayor
                            idxCodMax = (idxCodMax <= doc.codigo) ? 
                                            idx : idxCodMax;

                            this.fk_rol.selectList.push(doc._pathDoc);

                            //identifica cual es el default para el campo fk_rol    
                            if (doc.codigo <= baseCodigo) {
                                this.fk_rol.default = doc._pathDoc;
                            }
                        });
                        
                        //determina si se debe quitar de las lista de opciones la 
                        //posibilidad de que un rol cree roles de su mismo nivel
                        if (isRolCreateRol == false) {
                            //elimina la opcion
                            this.fk_rol.selectList.splice(idxCodMax, 1);
                        }
                    }

                },
                error:(err)=>{console.log(err)}
            }

            //crear handler$
            this._keyRolHandler = this._rolService.createHandler$(rfs_fk_rol, "Handler", "Metadata");
     
        }        
        
        if (!this._keyRolPathHandler || this._keyRolPathHandler == null) {
            const rfs_pathRol = <IRunFunSuscribe<Rol>>{
                next:(rol:Rol)=>{
                    if (rol != null) {
                        QValue.VQ_LtEqNum.codigo = rol.codigo;
                        this._rolService.getByCodigoForUsuario$(this._keyRolHandler, QValue);     
                    }else{
                        QValue.VQ_LtEqNum.codigo = baseCodigo;
                        this._rolService.getByCodigoForUsuario$(this._keyRolHandler, QValue);      
                    }
                },
                error:(err)=>{console.log(err)}
            };
            this._keyRolPathHandler = this._rolService.createHandler$(rfs_pathRol, "PathHandler", "Metadata");   
        }

        //determinar que consulta realizar
        if (!pathRol || pathRol == null)  {
            this._rolService.getByCodigoForUsuario$(this._keyRolHandler, QValue);         
        }else{
            this._rolService.getBy_pathDoc$(this._keyRolPathHandler, pathRol);
        }  
    }

    //================================================================
    /*export_meta__keyHadlersOrPathHandlers$()*/
    //exporta todas las keys handlers o pathhandlers usadas por este meta
    public export_meta__keyHadlersOrPathHandlers$():string[]{        
        //aqui TODOS los services en el contenedor de retorno
        return [            
            this._keyRolHandler,
            this._keyRolPathHandler
        ];
    }

}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*Clases _Meta para campo especiales (map_ y mapA_)*/
//estas clases no requieren metadata de coleccion

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
