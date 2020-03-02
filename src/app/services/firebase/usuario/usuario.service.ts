//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, observable, Subject, BehaviorSubject, } from 'rxjs';
import { map, switchMap, } from 'rxjs/operators';

import { IUsuario, Usuario } from '../../../models/firebase/usuario/usuario';
import { Usuario_Meta } from './usuario_Meta';
import { FSModelService, ETypePaginate, IQFilter,IControl$, IpathControl$, IRunFunSuscribe, IQValue, ETypePaginatePopulate } from '../fs_Model_Service';

//controls y modelos externos
import { Rol, IRol } from 'src/app/models/firebase/rol/rol';
import { RolService, IQValue_Rol } from '../rol/rol.service';

//================================================================================================================================
/*INTERFACES y ENUMs especiales para cada modelo de service*/
//Interfaces especiales para implementar contenedores de 
//objetos utilitarios para los metodos Pre  
//deben llevar el sufijo   _Modelo   del moedelo para no generar 
//conflictos con otras colecciones cuando se haga   import
//Ejemplo: Iv_PreGet{aqui el sufijo de coleccion o subcoleccion}

/*Iv_PreGet_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades externar al modelo (mas especificamente IModelo)
//para realizar calculos o enriquecer los docs leidos
//se recomienda crear objetos de esta interfaz en la 
//propiedad-funcion next de los objetos RFS
export interface Iv_PreGet_Usuario{

}

/*Iv_PreMod_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades externar al modelo (mas especificamente IModelo) 
//para realizar calculos o enriquecer el doc a modificar (ya sea crear o editar) 
export interface Iv_PreMod_Usuario{

}

/*IQValue_{Modelo}*/
//OPCIONAL el agregar propiedades
//contiene propiedades personalizadas para este modelo_util para 
//construir querys personalizadas y especificas
export interface IQValue_Usuario extends IQValue{

}

//================================================================================================================================
/*SERVICE DEL MODELO*/
//los servicios en angular implementas las funciones (en muchos casos las CRUD) de los datos recibidos 
//desde firebase, en otras palabras hace las veces de controller para angular
//================================================================================================================================
//es inyectable:
@Injectable({
    providedIn: 'root'
})
//================================================================================================================================
/*{Modelo}Service*/
//las clases services para CRUD para se deben nombrar con el 
//formato en singular de la siguiente manera: 
//
//Colecciones:  class ModeloService
//SubColecciones: class Emb_ModeloService
//

export class UsuarioService extends FSModelService< Usuario, IUsuario<any>,  Usuario_Meta, IUsuario<IQValue_Usuario>> {

    //================================================================

    //declarar controls$ foraneos de otros servicios
    private f_Rol$:IControl$<Rol>;
    private f_pathRol$:IpathControl$<Rol>;
    //================================================================

    constructor(
        private _afs: AngularFirestore, 
        private _rolService: RolService
    ) {
        super();
        //================================================================
        //cargar la configuracion de la coleccion:

        //indispensable dejar una referencia de_afs en la clase padre
        //IMPORTANTE: los servicios (como AngularFirestore) no se pueden 
        //inyectar directamente en la clase padre por problemas con super()
        super.U_afs = this._afs;
        
        //Objeto con metodos y propiedeades de utilidad para el service
        this.Model_Meta = new Usuario_Meta();

        //establece un limite predefinido para este 
        //service (es personalizable incluso se puede 
        //omitir y dejar el de la clase padre)
        //this.limitePaginaPredefinido = 10;

        //================================================================
        //aqui se debe llamar a todos los metodos setMeta_fk_[campo] de 
        //campos foraneos para este service        
        this.setMeta_fk_rol();

        //================================================================
        //--solo para TEST-------------------------------
        this.createDocsTest(false); //Normalmente en false
        //-----------------------------------------------
    }

    //================================================================================================================================
    /*Metodos: setMeta_fk_[campo]() Aqui se declaran*/
    //estos metodos permiten reconfigurar la metadata de los campos de 
    //este service que tengan algun tipo de relacion con servces foraneos
    //

    /*setMeta_fk_rol()*/
    //actualiza la metadata de fk_rol dependiendo 
    //de que usuario esta logueado actualmente
    //
    //Parametros:
    //pathRol: recibe el _pathDoc del usuario actualmente logueado
    //(si es que esta logueado), para consultar los docs necesarios para
    //la metadata
    public setMeta_fk_rol(pathRol?:string):void{

        this._rolService.ready()
        .then(()=>{

            if (!this.f_Rol$ || this.f_Rol$ == null) {

                //Funcion de tipo rfs_fk_[campo] que permite
                //actualizar dinamicamente la metadata para este campo 
                const rfs_fk_rol:IRunFunSuscribe<Rol> = {
                    next:(roles:Rol[])=>{this.Model_Meta.set_fk_rol(roles, this._rolService.Model_Meta.__Util.baseCodigo)},
                    error:(err)=>{console.log(err)}
                }
                this.f_Rol$ = this._rolService.createControl$(rfs_fk_rol);
                this.f_Controls$.push(this.f_Rol$);            
            }
    
            const codigoUsuario =  this._rolService.Model_Meta.__Util.baseCodigo;

            if (!pathRol || pathRol == null)  {
                this.f_Rol$ = this._rolService.getByCodigoForUsuario$(this.f_Rol$, codigoUsuario, null);         
            }else{
                if (!this.f_pathRol$ || this.f_pathRol$ == null) {
                    const rfs_pathRol = <IRunFunSuscribe<Rol>>{
                        next:(rol:Rol)=>{
                            if (rol != null) {
                                this.f_Rol$ = this._rolService.getByCodigoForUsuario$(this.f_Rol$, rol.codigo, null);     
                            }else{
                                this.f_Rol$ = this._rolService.getByCodigoForUsuario$(this.f_Rol$, codigoUsuario, null);      
                            }
                        },
                        error:(err)=>{console.log(err)}
                    };
                    this.f_pathRol$ = this._rolService.createPathControl$(rfs_pathRol);
                    this.f_pathControls$.push(this.f_pathRol$);                      
                }
                this.f_pathRol$ = this._rolService.getBy_pathDoc$(this.f_pathRol$, null, pathRol);
            }
                               
        })
        .catch((err)=>{
            console.log(err);
        });
    }

    //================================================================================================================================
    /*Consideraciones de lecturas*/
    //
    //Observaciones:
    //la librearia de @angular/Fire hace uso de observables para leer datos ademas
    //se manejan 3 formas diferentes de leer los datos de la BD
    //
    //1. Colecciones: cuando se lee varios (array) de documentos de una misma coleccion
    //de acuerdo a algun tipo de consulta o parametro de filtrado.
    //IMPORTANTE: cuando se lee a traves de colecciones el  PATH usado en  this._afs.collection(PATH, .....)
    //SIEMPRE debe apuntar a una COLECCION, no a un documento, esta libreria comprueba rudimentariamente
    //que apunta a una coleccion cuando el  PATH  tiene un numero de ubicaciones   IMPAR  
    //   "ubicacion1{coleccion}/ubicacion2{_idDoc}/ubicacion3{subColiccion}/......."
    //
    //2. Documento:  cuando se lee 1 y solo 1 documento, normalmente consulta por id  a 
    //traves de   path   de firestore  que es de la forma  "/coleccion/{_id del doc}"
    //IMPORTANTE: cuando se lee a traves de documentos el  PATH usado en    this._afs.doc<....>(filtroPath_id)
    //se debe apuntar SIEMPRE a un DOCUMENT, no a una coleccion; esta libreria comprueba rudimentariamente
    //que apunta a un docuemnto cuando el  PATH  tiene un numero de ubicaciones   PAR 
    //   "ubicacion1{coleccion}/ubicacion2{_idDoc}/ubicacion3{subColicc}on)/ubicacion4{_idDoc}......."
    //
    //3. collectionGroup: es un caso especial (y recien implementado en 2019) que permite agrupar varias subcolecciones 
    //y poderlas consultarlas a todas a la vez, ya que anteriormente no se podia realizar esta consultas de forma nativa
    //Ejemplo de datos almacenados en una coleccion de firestore:
    // coleccion:[
    //     {
    //      _id:"xxx1"
    //      campo:"algo1",
    //      subColeccion:[
    //          {
    //             _id:"S1xxx1"
    //              subcampo:"dato1-1",
    //          },
    //          {
    //             _id:"S1xxx2"
    //              subcampo:"dato1-2",
    //          },
    //      ]
    //     },
    //     {
    //         _id:"xxx2"
    //         campo:"algo2",
    //         subColeccion:[
    //             {
    //                _id:"S2xxx1"
    //                 subcampo:"dato2-1",
    //             },
    //             {
    //                _id:"S2xxx2"
    //                 subcampo:"dato2-2",
    //             },
    //         ]
    //        },
    // ]
    //en la estructura de datos anterior, firestore de forma basica permite realizar 
    //querys en los subcampo de solo una de las 2 subcolecciones a la vez, esto 
    //limita enormemente la posibilidad de obtener informacion que este contenida 
    //en las otras subcolecciones de la misma coleccion padre.
    //Sin embargo firestore implemento el permitir consultar todas las supcolecciones por medio
    //del metodo _afs.collectionGroup() pero para esta opcion SE DEBE CREAR UNA  EXENCION 
    //(que es lo contrario a un Indice)  POR CADA CAMPO que se quiera consultar de la subcoleccion
    //
    //================================================================
    /*Metodos CRUD SOLO COLECCIONES:*/
    //Observaciones:
    //al utilizar lecturas reactivas los metodos leer de CRUD varian
    //su comportamiento ya que difieren de la metodologia MVC tradicional
    //por lo tanto los filtros y construccion de querys son pasadas como 
    //propiedades al behavior determinado 
    //
    //Para el caso de las colecciones los metodos de lectura NO REQUIEREN
    //EL RECIBIR un pathColeccion ya que al ser colecciones RAIZ siempre 
    //su path sera con el formato: /{coleccion}
    //
    //Los metodos de lectura NO DEVUELVEN LOS DOCS LEIDOS, devuelven un 
    //objeto control$ de tipo IDoc$<TModelo, TIModelo_IvalQ> que contiene 
    //TODO lo referente a la lectura reactiva (behaviors, observables, 
    //suscriptions, limites, tipo de paginacion filtros querys y demas) 
    //dentro de este control$ se almacena un RFS que contiene las 
    //funciones que se ejecutan una vez obtenidos los docs
    //es la razon de que todas lso metodos de lectura tengan la terminacion  $
    //================================================================
    /*get$()*/
    //permite obtener todos los docs de una coleccion, es el metodo base de 
    //lectura con el cual se puede construir las demas consultas
    //Parametros:
    //doc$:
    //objeto control$ con toda la informacion de la lectura reactiva (aunque 
    //puede recibirse  null  si es la primera vez)
    //
    //RFS:
    //objeto con las funciones next() y error() para ejecutar una vez este suscrito
    //
    //QValue:
    //recibe un objeto creado a partir de la interfaz IModelo<IQValue_Modelo>
    //que a su vez contiene los valores necesarios para construir la query
    //(valores como:  buscar, rangos, iniciales, entre otros)
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //
    //limite:
    //indica el numero maximo de docs que puede leer en la query, si no se
    //recibe se le asigna el limite predefinido para todas las querys
    //
    //docInicial:
    //solo es necesario recibirlo si por alguna razon se quiere paginar 
    //No teniendo como base los snapshotsDocs sino otra cosa
    public get$(
        control$:IControl$<Usuario>, 
        QValue:IUsuario<IQValue_Usuario> | null, 
        v_PreGet:Iv_PreGet_Usuario = null,
        path_EmbBase:string = null, //Obligatorios para subcolecciones y que NO se desee consulta en collectionGroup
        limit=this.defaultPageLimit, 
        startDoc:any=null, 
    ):IControl$<Usuario>{
        
        //================================================================
        //configurar QValue por default si se requiere:
        if (!QValue || QValue == null) {
            QValue = <IUsuario<IQValue_Usuario>>{_id:{_orden:"asc"}};            
        }

        //configurar tipo de paginacion deseada:
        const typePaginate:number =  ETypePaginate.Full;

        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;

            //================================================================
            //ordenar, limitar y prepaginar con startDoc
            cursorQueryRef = cursorQueryRef.orderBy(this.Model_Meta._id.nom, QValue._id._orden || "asc");
            cursorQueryRef = cursorQueryRef.limit(limit);
            if (typePaginate == ETypePaginate.Single || typePaginate == ETypePaginate.Full) {
                cursorQueryRef = cursorQueryRef.startAfter(startDoc);
            }
            //================================================================
            return cursorQueryRef;
        };

        //================================================================
        //objeto para parametro:
        const QFilter:IQFilter = {query, v_PreGet, startDoc, limit, typePaginate};
        return this.readControl$(control$, QFilter, path_EmbBase);

    }

    /*getId$()*/
    //permite obtener un doc por medio de un id SIN  path_id, es un metodo auxiliar
    //con el mismo funcionamiento de las demas lecturas (excepto la de
    // getModelo_Path_id$() ).
    //
    //Recordar:en lo posible usar getModelo_Path_id$() a no ser que no se 
    //cuente con el path_id, para ese caso es mejor este metodo
    //
    //Parametros:
    //control$:
    //objeto  con toda la informacion de la lectura reactiva
    //
    //_id:
    //el id del documento, este _id puede ser de una fuente externa
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //
    //path_EmbBase:
    //es opcional para colecciones, es Obligatorios para subcolecciones 
    //y que NO se desee consulta en collectionGroup
    //
    //No requiere ni limite ni docInicial ya que se sobreentiende que devuelve solo 1 doc
    public getId$(
        control$: IControl$<Usuario>,
        _id:string,
        v_PreGet:Iv_PreGet_Usuario = null,
        path_EmbBase:string = null,
    ): IControl$<Usuario> {

        //================================================================
        //configurar tipo de paginacion deseada:
        const typePaginate:number =  ETypePaginate.No;

        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            //================================================================
            //Query Condiciones:
            cursorQueryRef = cursorQueryRef.where(this.Model_Meta._id.nom, "==", _id);            
            //================================================================
            //no se requiere paginar            
            return cursorQueryRef;
        };   
        //================================================================
        //objeto para parametro:
        const QFilter:IQFilter = {query, v_PreGet, startDoc:null, limit:0, typePaginate};
        return this.readControl$(control$, QFilter, path_EmbBase);
    }

    /*getUsuarioActualByAuthId()*/
    // permite obtener el usuario actual por medio del _id entregado por el servicio
    //auth una vez registrado y logueado
    //
    //Parametros:
    //control$:
    //objeto  con toda la informacion de la lectura reactiva
    //
    //auth_id:
    //el id del documento a buscar, para este caso es un id de 
    //proveedor externo entregado por firestore auth
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //
    //path_EmbBase:
    //es opcional para colecciones, es Obligatorios para subcolecciones 
    //y que NO se desee consulta en collectionGroup
    public getUsuarioActualByAuthId(
        control$: IControl$<Usuario>,
        auth_id:string,
        v_PreGet:Iv_PreGet_Usuario = null,
        path_EmbBase:string = null, 
    ):IControl$<Usuario>{

        //================================================================
        //configurar tipo de paginacion deseada:
        const typePaginate:number =  ETypePaginate.No;

        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
            //================================================================
            //Query Condiciones:
            cursorQueryRef = cursorQueryRef.where(this.Model_Meta._id.nom, "==", auth_id);            
            //================================================================
            //no se requiere paginar            
            return cursorQueryRef;
        };   
        //================================================================
        //objeto para parametro:
        const QFilter:IQFilter = {query, v_PreGet, startDoc:null, limit:0, typePaginate};
        return this.readControl$(control$, QFilter, path_EmbBase);
    }

    public getPorNombre$(
        control$: IControl$<Usuario>,
        QValue: IUsuario<IQValue_Usuario>,
        v_PreGet:Iv_PreGet_Usuario = null,
        path_EmbBase:string = null, //Obligatorios para subcolecciones y que NO se desee consulta en collectionGroup
        limit=this.defaultPageLimit, 
        startDoc:any=null, 
    ): IControl$<Usuario> {
        
        //================================================================
        //configurar QValue por default si se requiere:
        if (!QValue || QValue == null) {
            QValue = <IUsuario<IQValue_Usuario>>{nombre:{_orden:"asc"}}           
        }

        //configurar tipo de paginacion deseada:
        const typePaginate:number =  ETypePaginate.Single;
   
        //================================================================
        //Configurar la query de esta lectura:
        //esta query es una funcion que se cargará al behavior como filtro 
        //al momento de que este se ejecute
        const query = (ref: firebase.firestore.CollectionReference | firebase.firestore.Query) => {

            let cursorQueryRef: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;

            //================================================================
            //Query Condiciones:
            //
            //firestore no permite condiciones de busqueda avanzadas para strings 
            //asi que para suplir la consulta de textos que comiencen por algun texto
            //
            //se usa una consulta con 2 keys limitadoras y se obtiene todos los documentos 
            //que esten dentro de ese rango
            //
            if (QValue && QValue.nombre && QValue.nombre.ini) {
                let keyIni = QValue.nombre.ini.trim();
                //se calcula la keyFin que sera un caracter superior al keyIni
                let keyFin = this.getLlaveFinBusquedaStrFirestore(keyIni);
    
                //se establecen los rangos, entre mas texto tengan cada key mas precisa es la busqueda
                cursorQueryRef = cursorQueryRef.where(this.Model_Meta.nombre.nom, ">=", keyIni)
                                               .where(this.Model_Meta.nombre.nom, "<", keyFin);
            }
    
            //================================================================
            //ordenar, limitar y prepaginar con docInicial
            cursorQueryRef =  cursorQueryRef.orderBy(this.Model_Meta.nombre.nom, QValue.nombre._orden || "asc");
            cursorQueryRef = cursorQueryRef.limit(limit || this.defaultPageLimit);      
            if (typePaginate == ETypePaginate.Single || typePaginate == ETypePaginate.Full) {
                cursorQueryRef = cursorQueryRef.startAfter(startDoc || null);                    
            }    
            //================================================================
    
            return cursorQueryRef;
        };
    
        //================================================================
        //objeto para parametro:
        const QFilter:IQFilter = {query, v_PreGet, startDoc, limit, typePaginate};
        return this.readControl$(control$, QFilter, path_EmbBase);
        
    }

    //================================================================================================================================
    /*getBy_pathDoc$()*/
    //permite consultar un solo doc siempre y cuando se tenga el path_id
    //Parametros:
    //doc$:
    //objeto control$ con toda la informacion de la lectura reactiva (aunque 
    //puede recibirse  null  si es la primera vez)
    //
    //RFS:
    //objeto con las funciones next() y error() para ejecutar una vez este suscrito
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //
    //path_Id:
    //obligatorio, contiene el la RUTA CON ID del documento a leer, solo por 
    //primera vez se recibe un null y eso en casos que no se requiera 
    //inmediatamente obtener dicho doc
    //
    public getBy_pathDoc$(
        pathControl$: IpathControl$<Usuario>,       
        v_PreGet:Iv_PreGet_Usuario | null = null,
        _pathDoc: string | null
    ): IpathControl$<Usuario> {

        return this.readPathControl$(pathControl$, v_PreGet, this.preGetDocs, _pathDoc);
    }

    //================================================================================================================================
    /*paginate$()*/
    //este metodo determina y detecta el tipo de paginacion y solicita el
    //lote de documentos de acuerdo a los parametros
    //Parametros:
    //doc$:
    //objeto control$ con toda la informacion de la lectura reactiva 
    //(aqui NO PUEDE RECIBIRSE NULL)
    //
    //direccionPaginacion:
    //se debe recibir alguna de las 2 opciones "previo" | "siguiente"
    //Recordar que no todos los tipos de paginacion aceptan "previo"
    //
    public paginate$(
        control$: IControl$<Usuario>,
        pageDirection: "previousPage" | "nextPage"
    ): IControl$<Usuario> {

        return this.paginteControl$(control$, pageDirection);
    }

    //================================================================================================================================
    /*populate$()*/
    //permite el poblar documentos refernciado en campos con 
    //prefijo  fk_  que almacenan rutas _pathDoc de este modelo
    //este metodo se usa como paso intermedio en caso de desear
    //personalizarlo exclusivamente para este servicio
    //
    //Parametros:
    //pathControl$:
    //objeto control$ con la configuracion de observables y subscriciones
    //que se usen para poblar
    //
    //fk_pathDocs:
    //contiene el o los strings de _pathDoc que hacen referencia a otros documentos
    //si es es un slo string indica que el campo   fk_  esta relacionado con otra 
    //coleccion en modo 1a1 o 0a1, si es un array indica que el campo fk_ esta 
    //relacionado con otra coleccion como  0aMuchos o 1aMuchos 
    //
    //v_PreGet:
    //contiene el objeto con valores para customizar y enriquecer los 
    //docs obtenidos de la bd y antes de entregarlos a la suscripcion
    //se pude recibir un null
    //
    //limitPopulate:
    //si se desea un limite personalizado para la paginacion de poblar
    public populate$(
        pathControl$: IpathControl$<Usuario>,
        fk_pathDocs: string | string[],
        v_PreGet:Iv_PreGet_Usuario | null = null,        
        limitPopulate?:number
    ): IpathControl$<Usuario> {
        
        //conigurar el tipo de paginacion deseada
        const typePaginate = ETypePaginatePopulate.Single;

        return this.populateControl$(pathControl$, fk_pathDocs, v_PreGet, this.preGetDocs, typePaginate, limitPopulate);
    }

    /*pagitanePopulate()*/
    //es para paginacion basica de populate, por ahora solo redirecciona
    //al metodo principal pagitanePopulateControl$(), aqui se uede implementar
    //logica personalizada para cada paginacion, si se desea
    //
    //Parametros:
    //pathControl$:
    //el objeto contrl$ con los observables y suscripciones de cada
    //populate
    //
    //pageDirection
    // las 2 opciones de direccion de paginar (no en todos los 
    //typePaginate se pueden usar)
    public pagitanePopulate(
        pathControl$:IpathControl$<Usuario>,
        pageDirection: "previousPage" | "nextPage"
    ):IpathControl$<Usuario>{

        return this.pagitanePopulateControl$(pathControl$, pageDirection);
    }

    //================================================================================================================================    
    /*create*/
    //permite la creacion de un doc en tipo set
    //Parametros:
    //
    //newDoc:
    //el doc a crear
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public create(newDoc: Usuario, v_PreMod?:Iv_PreMod_Usuario): Promise<void> {

        //================================================================
        //pre modificacion y formateo del doc
        newDoc = this.preModDoc(newDoc,true, false, v_PreMod);
        //================================================================
        return this.createDocFS(newDoc, this.getPathCollection())
            .then(() => {
                //...aqui codigo personalizado

                //para encadenar promesas simpre retornar 
                //(si se quiere retornar un error se debe usar  throw )
                return;
            });
    }

    //================================================================
    /*update*/
    //permite la modificacion de un doc por medio de su _id
    //
    //Parametros:
    //
    //updatedDoc:
    //el doc a editar
    //
    //isStrongUpdate:
    //determina si se REEMPLAZAN los campos map_ y mapA_
    //o no se modifican
    //
    //v_PreMod?
    //objeto opcional para pre configurar 
    //y formatear el doc (decorativos)
    //
    public update(updatedDoc: Usuario, isStrongUpdate = false, v_PreMod?:Iv_PreMod_Usuario): Promise<void> {

        //================================================================
        //pre modificacion y formateo del doc
        updatedDoc = this.preModDoc(updatedDoc, false, isStrongUpdate, v_PreMod);
        //================================================================
        return this.updateDocFS(updatedDoc, this.getPathCollection())
            .then(() => {
                //...aqui codigo personalizado

                //para encadenar promesas simpre retornar 
                //(si se quiere retornar un error se debe usar  throw )
                return;
            });
    }
    //================================================================
    /*delete*/
    //permite la eliminacion de un doc por medio del _id
    //Parametros:
    //
    //_id:
    //string con id a eliminar
    //
    public delete(_id: string): Promise<void> {
 
        return this.deleteDocFS(_id, this.getPathCollection())
            .then(() => {
                //...aqui codigo personalizado

                //para encadenar promesas simpre retornar 
                //(si se quiere retornar un error se debe usar  throw )
                return;
            });

    }

    //================================================================        
    /*createControl$()*/
    public createControl$(
        RFS:IRunFunSuscribe<Usuario>
    ):IControl$<Usuario>{
        let control$ = this.createPartialControl$(RFS, this.preGetDocs);

        //================================================================
        //Configurar controls$ extrenos de apoyo para este control$
        
        //================================================================

        return control$;
    }
    /*createPathControl$()*/
    public createPathControl$(
        RFS:IRunFunSuscribe<Usuario>
    ):IpathControl$<Usuario>{
        let control$ = this.createPartialPathControl$(RFS, this.preGetDocs);

        //================================================================
        //Configurar controls$ externos de apoyo para este control$
        
        //================================================================

        return control$;
    }
    //================================================================
    /*preModDoc()*/
    //metodo que debe ejecutarse antes de crear o actualizar un documento
    //Parametros:
    //doc
    //el documento que se desea crear o actualizar
    //
    //isCreate:
    //determina si se desea crear o actualizar
    //
    //isStrongUpdate:
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

    private preModDoc(
        doc: Usuario,
        isCreate: boolean = true,
        isStrongUpdate = false,
        v_PreMod?: Iv_PreMod_Usuario,
        path_EmbBase?: string,
    ): Usuario {

        //================================================================
        //se determina si se desea crear el documento para su configuracion
        if (isCreate) {
            //================================================================
            //se determina si se genera un _id personalizado o si el objeto ya
            //trae consigo un _id de una fuente externa
            doc._id = (doc._id && typeof doc._id === 'string' && doc._id != "") ?
                doc._id :
                this.createIds();
            
            //aqui se genera el   _pathDoc   del doc a crear
            doc._pathDoc = this.create_pathDoc(doc._id, path_EmbBase);
            //================================================================
        }

        if (v_PreMod) {
            //...aqui toda la modificacion y formateo especial previo a guardar
        }
        //================================================================
        //aqui se formatean los datos del documento (se quitan campos 
        //inecesarios (no almacenables))
        doc = this.formatearDoc(doc, this.Model_Meta);
        //================================================================                               
        return doc;
    }

    //================================================================
    /*preGetDocs()*/
    //Funcion que debe ejecutarse antes de entregar CADA DOCUMENTO LEIDO 
    //(documento por documento) en el pipe del observable de lectura
    //
    //IMPORTANTE: este metodo se usa tambien como variable-funcion
    //para ser pasado a la clase padre como parametro, es publico para
    //poderlo usar en metodos populateDocs
    //
    //Parametros:
    //docs ->  documento o documentos que se leyeron de firebase
    //v_PreLeer-> objeto que contiene datos para enriqueser o realizar operaciones
    //          (por ejemplo cargar los campos virtuales) antes de entregar a
    //          la vista o componente correspondiente
    public preGetDocs(
        doc:Usuario, 
        v_PreGet?: Iv_PreGet_Usuario
    ):Usuario {

        if(v_PreGet && v_PreGet != null){
            //================================================================
            //aqui todo lo referente a la modificacion de cada documento antes 
            //de devolverlo
            
            //================================================================
        }
        //retornar doc ya customizado y enriquecido
        return doc;
    }

    //================================================================
    /*createDocsTest()*/  
    // permite crear hasta 10 documentos para hacer pruebas
    private createDocsTest(isActived:boolean=false){
        if(isActived){

            this.ready()
            .then(()=>{

            })
  
        }
    }  
}
//================================================================================================================================



