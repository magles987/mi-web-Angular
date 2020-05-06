import { Observable, Subscription, BehaviorSubject, from } from 'rxjs';
import { ServiceHandler$, IRunFunSuscribe, ServiceBehaviorHandler$, ISubscriptionHandler} from '../ServiceHandler$';
import { Ifs_Filter, ETypePaginate, ETypePaginatePopulate } from './fs_Model_Service';
import { mergeAll } from 'rxjs/operators';

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*metaHandler:*/
//objeto basico de metadatos para cada 
//Servicehandler usado de caracter informativo
export interface ImetaHandler {
    keyHandler:string,
    sourceModel:string,
    sourceType:string 
}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*abstract class Fs_ServiceHandler*/
//
abstract class Fs_ServiceHandler$<TModel, BhFilter> extends ServiceBehaviorHandler$<TModel, BhFilter>{
    
    //contenedor para masivo handlers para el 
    //manejo de paginacion y poblar
    protected containerHandlers$:ServiceBehaviorHandler$<TModel, BhFilter>[]; 

    //sirve de soporte para el containerHandler$, al almacenar 
    //copia de todos los idSubscribes y RFSs para implementar 
    //en cada elemento que se cree en el contenedor.
    //IMPORTANTE: NO almacena subscriptions activas
    private mapBackUpIdSubsAndRFSs:Map<string, IRunFunSuscribe<TModel>>;

    constructor(){
        super();
        this.containerHandlers$ = [];
        this.mapBackUpIdSubsAndRFSs = new Map();
    }
    //================================================================
    /*rebootAttributes()*/
    //se implementará para reiniciar las propiedads mas 
    //importantes de cada tipo de handler
    protected abstract rebootAttributes():void;

    //================================================================
    /*setBehavior()  @Override*/
    //actualiza un el objeto de la propiedad this.behavior
    //en la clase padre
    //
    //Recordar: la propiedad this.behavior NO usa metodo  set 
    //tradicional ya que se puede llegar a requerir una configuracion 
    //flexible que los metodos accesor no la permite, como en el 
    //caso de containerHandlers$
    //
    //Parametros:
    //
    //updatedBehavior: el behavior actualizado
    //
    //idxContainer: el index del behabior a actualizar que esta almacenado 
    //en el containerHandlers$
    public setBehavior(
        newBehavior:BehaviorSubject<BhFilter | null>, 
        idxContainer?:number
    ):void{
        idxContainer = this.testIdxCH(idxContainer);
        this.containerHandlers$[idxContainer].setBehavior(newBehavior);
        return;
    }

    /*getBehavior()  @Override*/
    //devuelve el objeto de la propiedad this._behavior
    //segun el contexto
    //
    //Recordar: la propiedad this._behavior NO usa metodo  get 
    //tradicional ya que se puede llegar a requerir una configuracion 
    //flexible que los metodos accesor no la permite, como en el 
    //caso de containerHandlers$
    //
    //Parametros:
    //
    //idxContainer: el index del behabior a devolver que esta almacenado 
    //en el contenedor containerHandlers$ si no se recibe nada 
    //indica que se debe seleccionar el ultimo
    public getBehavior(
        idxContainer?:number
    ):BehaviorSubject<BhFilter | null>{
        idxContainer = this.testIdxCH(idxContainer);
        return this.containerHandlers$[idxContainer].getBehavior();
    }

    //================================================================
    /*setObservable() @Override*/
    //asigna un observable de acuerdo al contexto del containerHandler$
    //
    //Recordar: la propiedad this.observable NO usa metodo  set 
    //tradicional ya que se puede llegar a requerir una configuracion 
    //flexible que los metodos accesor no la permite, como en el 
    //caso de containerHandlers$
    //
    //Parametros:
    //newObs : en nuevo observable a almcaenar
    //
    //idxContainer: el index del elemento del contenedor populateHandlers$
    //al cual se le quiera actualizar el observable
    public setObservable(
        newObs:Observable<TModel>,
        idxContainer?:number
    ):void{
        idxContainer = this.testIdxCH(idxContainer);
        this.containerHandlers$[idxContainer].setObservable(newObs);
    }

    /*getObservable @Override*/
    //Obtiene el observable almacenado de acuerdo al contexto 
    //al elemento del containerHnadler$
    //
    //Recordar: la propiedad this.observable NO usa metodo  set 
    //tradicional ya que se puede llegar a requerir una configuracion 
    //flexible que los metodos accesor no la permite, como en el 
    //caso de containerHandlers$
    //
    //Parametros:
    //idxContainer : recibe el index del elemento almacenado en 
    //containerHandlers$ del cual se quiere obtener el observable
    //si se recibe undefined se usa como dfault el index del 
    //ultimo elemento
    public getObservable(
        idxContainer?:number
    ):Observable<TModel>{
        idxContainer = this.testIdxCH(idxContainer);                
        return this.containerHandlers$[idxContainer].getObservable();
    }    

    //================================================================
    /*addSubscribe() @Override*/
    //crear y adicionar una subscripcion al map diccionario de 
    //mapSubscripHandlers de la clase padre de acuerdo al contexto del
    //containerHandler$
    //
    //Parametros:
    //
    //newIdSubscribe: texto identificador de la subscripcion (se debe asignar
    //externamente)
    //
    //newRFS: objeto de tipo IRunFunSuscribe<T> que almacena la logica que se 
    //ejecuta al subscribirse al observable
    public addSubscribe(
        newIdSubscribe:string | null,
        newRFS:IRunFunSuscribe<TModel> | null
    ):void{

        //agregar los nuevos idSubscribe y RFS si existen
        if (newIdSubscribe && newIdSubscribe != null && 
            newRFS && newRFS != null
        ) {
            this.mapBackUpIdSubsAndRFSs.set(newIdSubscribe, newRFS);
        }

        //se analiza cada mapa de cada elemento del contentenedor para igualarlos 
        //todos con los mismos RFSs y subscripciones
        for (let i = 0; i < this.containerHandlers$.length; i++) {

            //cada map diccionario de cada elemento del containerHandlers$
            const mapCH = this.containerHandlers$[i].getMapSubscripHandler();

            //verifica que CADA elemento del containerHandler$ tenga asignado 
            //todos los RFSs que estan en el backup
            this.mapBackUpIdSubsAndRFSs.forEach((RFS, idSubcribe) => {
                //verifica si no existe el idSubscribe para adicionarlo
                if (mapCH.has(idSubcribe) == false) {
                    this.containerHandlers$[i].addSubscribe(idSubcribe, RFS);
                }
                return;
            });
        }   
    }

    /*unsubscribeById() @Override*/
    //desuscribe una subscripcion SIN eliminarla del  map diccionario
    //de acuerdo al contexto de containerHandler$
    //Parametros:
    //idSubscribe : el id de la subscripcion a desubscribir
    public unsubscribeById(idSubscribe:string):void{
        for (let i = 0; i < this.containerHandlers$.length; i++) {
            this.containerHandlers$[i].unsubscribeById(idSubscribe);                
        }
        return;
    }

    /*unsubscribeAll() @Override*/
    //desuscribe TODAS subscripciones SIN eliminarla del  map diccionario
    //de acuerdo al contexto de containerHandler$
    public unsubscribeAll():void{
        for (let i = 0; i < this.containerHandlers$.length; i++) {
            this.containerHandlers$[i].unsubscribeAll();                
        }
        return;
    }    

    //================================================================
    /*getContainerHandlerByIdx$()*/
    //retorna el Handler almacenado en el contenedor populateHandlers$ 
    //de acuerdo a su index
    public getContainerHandlerByIdx$(
        idxContainer:number
    ):ServiceBehaviorHandler$<TModel, BhFilter>{
        return this.containerHandlers$[idxContainer];
    }

    /*getSizeContainerHandlers$()*/
    //devuelve el numero de elementos del contenedor
    public getSizeContainerHandlers$():number{
        return this.containerHandlers$.length;
    }

    /*getLastContainerHandler$()*/
    //retorn el ultimo elemento del contenedor
    //populateHandlers$
    public getLastContainerHandler$():ServiceBehaviorHandler$<TModel, BhFilter>{
        return this.containerHandlers$[this.containerHandlers$.length -1];
    }

    /*getIdxLastCH()*/
    //devuelve el numero del ultimo 
    //elemento del contenedor populateHandlers$
    public getIdxLastCH():number{
        return (this.containerHandlers$.length > 0) ?
                this.containerHandlers$.length - 1 : null;
    }

    /*testIdxPH()*/
    //se busca analizar el index seleccionado del contenedor populateHandlers, 
    //para saber si esta en el rango del contenedor o asignar valores 
    //predefinidos, modificandolo
    //Parametros:
    //idxContainer : el index que se desea analizar
    protected testIdxCH(idxContainer:number):number{
        //determinar si esta en el rango de lo elementos 
        //almacenados en el contenedor populateHandlers$
        //de lo contrario devuleve por default el ultimo        
        return (idxContainer && 
            idxContainer >= 0 && 
            idxContainer < this.containerHandlers$.length) ? 
            idxContainer : this.getIdxLastCH();
    }    

    //================================================================
    /*getObservableMergeAll()*/
    //obtiene un observable que agrupa todos los observables almacenados
    //en el contenedor populateHandlers, para la agrupacion se usa un
    //mergeAll()
    public getObservableMergeAll():Observable<TModel> {
        //determina si solo existe un elemento en el
        // contenedor para no realizar mergeAll a uno solo
        if (this.containerHandlers$.length == 1
        ) {
            return this.getObservable();
        }

        let obs:Observable<TModel>[] = [];
        for (let i = 0; i < this.containerHandlers$.length; i++) {
            obs.push(this.containerHandlers$[i].getObservable());
        }
        return from(obs).pipe(mergeAll());
    }

    //================================================================
    /*closePopulateHandlers$()*/
    //metodo exclusivo para esta clase que permite desuscribirse 
    //SOLO a los elementos del containerHnadler$, la idea es usarlo 
    //para situaciones en donde se requiera desocupar memoria 
    //por exceso de subscripciones inutiles, a diferencia del
    //  closeAllHandlers$() @Override   este metodo SOLO debe
    //desubscribe los populateHandlers$ almacenados en el contenedor
    //
    //Parametros:
    //keepAlive: determina (segun el orden en que se hallan creado)
    //el numero, de los primeros subscritos, de SubscriptionHandlers 
    //que deben quedar vivos
    //IMPORTANTE: keepAlive es una cantidad (un size) por lo tanto no usa logica 0
    //se inicializa en 0 indicando que no se desea dejar viva ninguna subscripcion
    public closeContainerHandlers$(keepAlive:number=0):void{
        if (keepAlive < 0) {
            throw "la variable keepAlive es menor a 0";
        }

        if (this.containerHandlers$.length > 0) {

            while (this.containerHandlers$.length > keepAlive) {
                const idxCH = this.containerHandlers$.length - 1;
                //llama a cerramiento por idx para usar el 
                //tiempo de espera
                this.closeContainerHandlerByIdxCH(idxCH); 
            }
        }
        return;
    }

    /*closeContainerHandlerByIdxCH()*/
    //variacion del metodo anterior que lo que intenta es cerrar 
    //y desuscribir la subscripcion de un elemento del containerHandler$ 
    //especificado por un index
    //Parametros:
    //idxContainer: el index del elemento a cerrar
    public closeContainerHandlerByIdxCH(idxContainer:number):void{
        if (this.containerHandlers$.length > 0 &&
            this.containerHandlers$[idxContainer] &&
            this.containerHandlers$[idxContainer] != null
        ) {
            //tiempo de espera para cerrar el handler, minimisando 
            //el riesgo de cerrar antes de recibir el ultimo doc
            // que este en tramite
            const t = 5//5ms;
            setTimeout(() => {
                this.containerHandlers$[idxContainer].closeAllHandlers$(this.containerHandlers$[idxContainer]);
                this.containerHandlers$.splice(idxContainer,1);                
            }, t);
        }
        return;
    }

}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

/*class Fs_MServiceHandler$ extends ServiceBehaviorHandler$<TModel, IBhFilterHandler> */
//los objeos de ese tipo administran los obsevables, behavior y subscripciones referentes a 
//consultas a nivel coleccion en firestore
export class Fs_MServiceHandler$<TModel, TBhFilter> extends Fs_ServiceHandler$<TModel[], TBhFilter> {

    //lleva el control generico de la pagina actual
    //que se ha leido de los docs.
    //se usa logica de inicial de 0
    public currentPageNum:number;

    //array que contendrá un todos los snapshotDocs
    //claves para paginacion por medio del metodo startAt()
    public snapshotStartDocs: any[];

    //puede contener una copia del limite de paginacion
    //normal (para la mayoria de tipos de paginacion) o
    //contienen el acumulado de limite que se aumenta
    //dinamicamente cuando se usa el tipo de paginacion
    //acumulativa
    public accumulatedLimit: number;
    
    //almacena los docs que se estan rastreando
    public listDocs: TModel[];

    //determina si se usa en modo multiHadler$
    //el cual se requiere para la paginacion full
    public isMultiHandler:boolean;    
    
    constructor(
        //una metadata de uso informativo
        private metaHandler$:ImetaHandler        
    ){
        super();        
        this.isMultiHandler = false;
        this.rebootAttributes();        
    }

    //================================================================
    /*rebootAttributes()*/
    //reiniciar los atributos mas importantes
    protected rebootAttributes():void{
        this.listDocs = [];
        this.currentPageNum = 0;
        this.accumulatedLimit = 0;
        this.snapshotStartDocs = [null];
        return;
    }

    //================================================================
    /*configNewQueryForHandler()*/
    //permite la configuracion inicial del handler$ previa a una 
    //nueva consulta
    //
    //Argumentos:
    //
    //BhFilter: objeto con las propiedades basicas para filtra UNA 
    //SOLA CONSULTA, este objeto es el mismo tipo del filtro 
    //del behavior
    //   
    public configHandler(BhFilter:TBhFilter){

        //cerrar todos los handlers de containerHandlers$ 
        //excepto el primero 
        this.closeContainerHandlers$(1);

        //inicializar propiedades acumulativas
        this.rebootAttributes();

        //cast para usar la interfaz de Firestore para los filtros
        const fs_BhF = BhFilter as Ifs_Filter;
        this.snapshotStartDocs = [fs_BhF.startDoc];

    }

    //================================================================
    /*createBehaviors()*/
    //crea un nuevo behavior a partir del TBhFilter que se asignara
    //al behavior nuevo
    //
    //Argumentos
    //
    //BhFilter: filtro a asignar en el behavior (puede recibirse null 
    //cuando se crea por primera vez el handler externo)
    public createBehavior(BhFilter:TBhFilter | null):void{

        //agrega un nuevo ServiceBehaviorHandler$ al contenedor
        this.containerHandlers$.push(new ServiceBehaviorHandler$<TModel[], TBhFilter>());

        //crea el nuevo behavior
        const newBh = new BehaviorSubject<TBhFilter | null>(BhFilter);
        this.getLastContainerHandler$().setBehavior(newBh); 
    }

    //================================================================
    /*nextFilterBh() @Override*/
    //encapsula la logica de realizar una nueva 
    //solicitud de observable al behavior
    //
    //Parametros:
    //
    //BhFilter: el filtro a cargar con el metodo next()
    //
    //idxCH: indica el index del elemento de del 
    //containerHandler$ al que se le desea realizar 
    //el llamado a next(), este index es opcional 
    //si no se recibe se deja que el metodo testIdxCH() 
    //determine que index es el mas adecuado 
    //
    //accumulativeFactor : aun sin implementar
    public nextFilterBh(
        BhFilter:TBhFilter,
        idxCH?:number,
        accumulativeFactor = 0
    ):void{
        idxCH = this.testIdxCH(idxCH);
        this.containerHandlers$[idxCH].nextFilterBh(BhFilter);
        return;
    }

    //================================================================
    /*getBhFilter() @Override*/
    //obtiene el BhFilter asociado actualmente al behavior 
    public getBhFilter(
        idxCH?:number
    ):TBhFilter{  
        idxCH = this.testIdxCH(idxCH);
        return this.containerHandlers$[idxCH].getBhFilter();        
    }    

    //================================================================
    /*closeAllHandlers$() @Override*/
    //
    //Parametros:
    //    
    //Handlers$: el array con los Fs_ModelSHandler$ a desubscribir
    //
    //keepAlive: determina (segun el orden en que se hallan creado)
    //el numero, de los primeros subscritos, de SubscriptionHandlers 
    //que deben quedar vivos
    //IMPORTANTE: keepAlive No es un index por lo tanto no usa logica 0    
    //se inicializa en 0 indicando que no se desea dejar viva ninguna subscripcion
    public closeAllHandlers$(
        Handlers$:Fs_MServiceHandler$<unknown, unknown> | Fs_MServiceHandler$<unknown, unknown>[],
        keepAlive:number=0
    ):void{

        if (keepAlive < 0) {
            throw "la variable keepAlive es menor a 0";
        }

        Handlers$ = (Array.isArray(Handlers$)) ? Handlers$ : [Handlers$];

        while (Handlers$.length > keepAlive) {
            const idxH = Handlers$.length - 1; 
            
            Handlers$[idxH].closeContainerHandlers$();
            Handlers$[idxH].rebootAttributes();
            Handlers$.pop();
        }
    }

}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*class Fs_MServicePathHandler$<TModel, TModel_Meta> extends Fs_Handler$<TModel, TModel_Meta>*/
//
export class Fs_MServicePathHandler$<TModel> extends Fs_ServiceHandler$<TModel | TModel[], string> {

    //almacena solo 1 _pathDoc cuando no esta activada 
    //la opcion populate
    public _pathDoc: string | null;

    public isPopulateHandler:boolean;

    //lleva el control generico de la pagina actual
    //que se ha leido de los docs poblados.
    //se usa logica de inicial de 0
    public currentPageNum:number;

    public idxBhPathPopulate:number;
   
    //almacena los docs poblados que se estan rastreando
    public listPopulateDocs: TModel[];

    //contiene el limite de docs a poblar por pagina
    public limitPopulate: number;

    //enum con las opciones de tipo de paginacion 
    //para poblar
    public typePaginatePopulate:ETypePaginatePopulate;

    //contenedor de TODOS los pathDocs
    //que se usan para poblar (se hallan o no poblado)
    public _pathPopulateDocs:string[]; 
    
    constructor(
        private metaPathHandler$:ImetaHandler        
    ){
        super();        

        this.rebootAttributes();
    }
    
    //================================================================
    /*rebootAttributes()*/
    //reiniciar los atributos mas importantes
    protected rebootAttributes():void{
        this.isPopulateHandler = false;
        this.limitPopulate = 0;
        this.typePaginatePopulate = ETypePaginatePopulate.No;
        this.listPopulateDocs = [];
        this.currentPageNum = 0;
        this.idxBhPathPopulate = 0;

        this._pathPopulateDocs = [];
        this._pathDoc = null;
        return;
    }
            
    //================================================================
    /*configPathHandler()*/
    // permite la configuracion inicial del handler 
    //para una nueva consulta
    //Parametros:
    //
    //_pathDoc: se recibe si solo se desea consultar un _pathDoc 
    //especifico (se debe enviar  null si no se desea consulta basica)
    //
    //_pathPopulateDocs: se recibe si se desea poblar (se debe enviar 
    //un [] vacio si No se desea poblar) 
    //
    //typePaginatePopulate : solo si se desea poblar se debe asignar 
    //un tipo de paginacion
    //
    //limitPopulate: un limite de paginacion para poblar si no se 
    //desea usar el predefinido
    public configPathHandler(
        _pathDoc:string | null,
        _pathPopulateDocs:string[], 
        typePaginatePopulate:ETypePaginatePopulate,
        limitPopulate:number = _pathPopulateDocs.length, 
    ):void{

        if (_pathPopulateDocs.length == 0) {
                        
            //inicializar propiedades acumulativas
            this.rebootAttributes();
            this._pathDoc = _pathDoc;
            this.isPopulateHandler = false;

            //cerrar todos los elementos del containerHandlers$ 
            //excepto el primero
            this.closeContainerHandlers$(1);

        }else{

            //inicializar propiedades acumulativas
            this.rebootAttributes();
            this._pathPopulateDocs = _pathPopulateDocs;
            this.typePaginatePopulate = typePaginatePopulate;
            this.limitPopulate = limitPopulate;
            this.isPopulateHandler = true;

            //cerrar todos los elementos del containerHandlers$ 
            this.closeContainerHandlers$();            
        }

        return;
    }
    //================================================================
    /*createBehaviors()*/
    //crea un nuevo behavior a partir del IBhFilterHandler que previamente 
    //DEBE ESTAR CONFIGURADO en la propiedad this.IBhFilterHandler 
    public createBehavior(BhPathDoc:string = this._pathDoc):void{
        
        //agrega un nuevo ServiceBehaviorHandler$ al contenedor
        this.containerHandlers$.push(new ServiceBehaviorHandler$<TModel, string>());

        //crea el nuevo behavior
        const newBh = new BehaviorSubject<string | null>(BhPathDoc);
        this.getLastContainerHandler$().setBehavior(newBh); 
        
    }
    
    //================================================================
    /*nextFilterBh() @Override*/
    //encapsula la logica de realizar una nueva 
    //solicitud de observable al behavior
    //
    //Parametros:
    //
    //BhFilter: el filtro a cargar con el metodo next()
    public nextFilterBh(
        BhFilter:string | string[], 
        accumulativeFactor = 0
    ):void{
    
        //garantizar que BhFilter sea un array
        BhFilter = (Array.isArray(BhFilter)) ? BhFilter : [BhFilter];

        if (this.containerHandlers$.length < BhFilter.length) {
            throw `el filtro ${BhFilter} es mayor al tamaño del container ${this.containerHandlers$.length}`; 
        }

        for (let i = 0; i < BhFilter.length; i++) {
            const idxFactor = i + accumulativeFactor;
            this.containerHandlers$[idxFactor].nextFilterBh(BhFilter[i]);
        }

        return;
    }

    //================================================================
    /*closeAllHandlers$() @Override*/
    //
    //Parametros:
    //    
    //Handlers$: el array con los Fs_ModelSPathHandler$ a desubscribir
    //
    //keepAlive: determina (segun el orden en que se hallan creado)
    //el numero, de los primeros subscritos, de SubscriptionHandlers 
    //que deben quedar vivos
    //IMPORTANTE: keepAlive No es un index por lo tanto no usa logica 0    
    //se inicializa en 0 indicando que no se desea dejar viva ninguna subscripcion
    public closeAllHandlers$(
        Handlers$:Fs_MServicePathHandler$<unknown> | Fs_MServicePathHandler$<unknown>[],
        keepAlive:number=0
    ):void{

        if (keepAlive < 0) {
            throw "la variable keepAlive es menor a 0";
        }

        Handlers$ = (Array.isArray(Handlers$)) ? Handlers$ : [Handlers$];

        while (Handlers$.length > keepAlive) {
            const idxH = Handlers$.length - 1; 
            
            Handlers$[idxH].closeContainerHandlers$();
            Handlers$[idxH].rebootAttributes();
            Handlers$.pop();
        }
    }

}

