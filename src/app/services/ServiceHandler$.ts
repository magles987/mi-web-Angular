import { Observable, Subscription, BehaviorSubject } from 'rxjs';
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IRunFunSuscribe*/
//permite construir objetos con las propiedades de tipo funcion
//que se ejecutan cuando se subscribe cada observable de los
//objetos handler$
export interface IRunFunSuscribe<T>{
    next: (res: T) => void;
    error: (error:any) => void;
    complete?:() => void;
}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

/*ISubscriptionHandler:*/
//handler interno especial para las subscripciones en cantidad 
export interface ISubscriptionHandler<T> {
    //las funciones next(), error() (y complete()
    //opcional) que se ejecutan una vez suscrito al
    //observable correspondiente
    RFS:IRunFunSuscribe<T>;  

    //almacena la subscripcion al del observable al RFS 
    //que este almacenado en este mismo objeto
    subscription: Subscription; 
    
}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*class ServiceHandler$*/
//manejador y contenedor global para la mayoria de observables 
//y subscripciones que se utilicen en el proyecto
export class ServiceHandler$<T> {

    //observable a administrar
    private observable: Observable<T>;

    //map diccionario interno que almacenara los RFSs y las  
    //subscriciones correspondientes
    private mapSubscripHandlers:Map<string, ISubscriptionHandler<T>>;

    constructor(){
        this.observable = null;
        this.mapSubscripHandlers = new Map<string, ISubscriptionHandler<T>>();
    }

    //================================================================
    /*setObservable()*/
    //almacena un nuevo observable, el observable que se recibe 
    //YA DEBE VENIR CONFIGURADO
    //
    //IMPORTANTE: la propiedad this._observable NO usa metodo  set  
    //tradicional ya que se requiere hacer varias modificaciones 
    //en los metodos @override de las clases hijas que los
    //metodos accesro no lo permiten
    //
    //Parametros:
    //
    //newObs: el observable a almacenar
    public setObservable(
        newObs:Observable<T>
    ):void{
        //determinar si existe previamente un observable 
        //para desubscribir todo lo referente a el y 
        //asignarle al nuevo obs
        if (this.observable == null || this.mapSubscripHandlers.size == 0) {
            this.observable = newObs;            
        } else {

            //desuscribe todas las subscripciones atadas 
            //al anterior observable
            this.unsubscribeAll();
            
            this.observable = newObs; 
            
            //actualiza todas las subscripciones al nuebo observable
            this.mapSubscripHandlers.forEach((subsH, idSubscribe, map) => {
                subsH.subscription = this.observable.subscribe(subsH.RFS);
                map.set(idSubscribe, subsH);
            });
        }

        return;
    }

    /*getObservable()*/
    //devuelve el objeto de la propiedad this._observable
    //
    //IMPORTANTE: la propiedad this._observable NO usa metodo  get  
    //tradicional ya que se requiere hacer varias modificaciones 
    //en los metodos @override de las clases hijas que los
    //metodos accesro no lo permiten
    //
    public getObservable():Observable<T>{
        return this.observable;
    }

    //================================================================
    /*getMapSubscripHandler()*/
    //permite el acceso al map diccionario de las subscripciones
    //
    //IMPORTANTE: la propiedad this.mapSubscripHandlers NO usa metodos    
    //set ni get tradicionales ya que se requiere hacer varias modificaciones 
    //en los metodos @override de las clases hijas que los
    //metodos accesro no lo permiten
    //Parametros:
    //
    public getMapSubscripHandler():Map<string, ISubscriptionHandler<T>>{
        return this.mapSubscripHandlers;
    }
    
    public setMapSubscripHandler(mapSubHanlder:Map<string, ISubscriptionHandler<T>>):void{
        this.mapSubscripHandlers = mapSubHanlder;
    }

    //================================================================
    /*addSubscribe()*/
    //crear y adicionar una subscripcion al map mapSubscripHandlers
    //este objeto cuenta con un identificador de tipo string  QUE DEBE SER UNICO
    //que permitirá no repetir subscripciones que ya se hallan realizado para
    //el mismo observable y que ejecuten la misma logica
    //
    //Parametros:
    //
    //newIdSubscribe: texto identificador de la subscripcion (se debe asignar
    //externamente)
    //
    //newRFS: objeto de tipo IRunFunSuscribe<T> que almacena la logica que se 
    //ejecuta al subscribirse al observable
    public addSubscribe(
        newIdSubscribe:string,
        newRFS:IRunFunSuscribe<T>
    ):void {

        //construir la nueva susbcripcion:
        const newSubHandler:ISubscriptionHandler<T> = {
            RFS: newRFS,
            subscription : this.observable.subscribe(newRFS)
        };

        //determinar si por alguna eventualidad ya esta 
        //asignada esta subscripcion
        if (this.mapSubscripHandlers.has(newIdSubscribe)) {
            
            //desuscribir la subscripcion repetida
            const currentSub = this.mapSubscripHandlers.get(newIdSubscribe);
            currentSub.subscription.unsubscribe();
            this.mapSubscripHandlers.delete(newIdSubscribe);
        
        } 

        //se adiciona al map la nueva suscripcion
        this.mapSubscripHandlers.set(newIdSubscribe, newSubHandler);

    }

    /*unsubscribeById()*/
    //a partir de un idSubscribe permite desuscribir una subscripcion 
    //y da la opcion de eliminarla del map diccionario 
    //
    //Parametros:
    //
    //idSubscribe el id de la subscripcion
    //
    //isDelete: determina si se desea eliminar del map diccionario
    //
    public unsubscribeById(
        idSubscribe:string,
        isMapDelete:boolean = false
    ){
        //determinar si el idSubscribe esta almacenado y activo
        if (this.mapSubscripHandlers.has(idSubscribe)) {
            
            const subscription = this.mapSubscripHandlers.get(idSubscribe).subscription;
            
            //desuscribir si no se ha hecho antes
            if (subscription.closed == false) {
                subscription.unsubscribe();
            }

            //determinar si se elimina del map diccionario
            if (isMapDelete == true) {
                this.mapSubscripHandlers.delete(idSubscribe);
            }            
        } else {
            throw "No se encontro el idSubscribe " + idSubscribe;            
        }
    }

    /*reSubscribeById()*/
    //
    //Parametros:
    //
    public reSubscribeById(
        idSubscribe:string
    ):void{
        if (this.mapSubscripHandlers.has(idSubscribe) == true) {
            const SubsH = this.mapSubscripHandlers.get(idSubscribe);
            if (SubsH.subscription.closed == true) {
                SubsH.subscription = this.observable.subscribe(SubsH.RFS);
                this.mapSubscripHandlers.set(idSubscribe, SubsH);                
            }
        }        
        throw `No existe el ${idSubscribe} en las keys del map: ${Array.from(this.mapSubscripHandlers.keys())}`;
    }

    /*unsubscribeAll()*/
    //
    //Parametros:
    //
    public unsubscribeAll(
        isMapDelete=false
    ):void{
        const idSubscribes = Array.from(this.mapSubscripHandlers.keys());
        for (let i = 0; i < idSubscribes.length; i++) {
            this.unsubscribeById(idSubscribes[i], isMapDelete);            
        }
        return;
    }

    //================================================================
    /*setObservableAndAddSubscribe()*/
    //devuelve un array de parejas idSubscribe y RFS de acuerdo a 
    //lo contenido en el map
    public getIdSubscribeAndFRSs():[string, IRunFunSuscribe<T>][]{
        let idSubscribesAndRFSs:[string, IRunFunSuscribe<T>][] = []; 
        this.mapSubscripHandlers.forEach((subscribe, idSubs) => {
            idSubscribesAndRFSs.push([idSubs, subscribe.RFS]);
        });
        return idSubscribesAndRFSs;
    }
    //================================================================
    /*closeAllHandlers$()*/
    //permite la desubscripcion de TODOS los serviceHandlers$ que se reciban 
    //en el array y tambien se ELIMINA las subscripciones del map diccionario
    //
    //Parametros:
    //
    //Handlers$: el array con los serviceHandlers$ a desubscribir
    //
    //keepAlive: determina (segun el orden en que se hallan almacenado en 
    //el map diccionario) el numero, de los primeros subscritos del map diccionario
    //que deben quedar vivos 
    //IMPORTANTE: keepAlive No es un index por lo tanto no usa logica 0    
    //se inicializa en 0 indicando que no se desea dejar viva ninguna subscripcion
    public closeAllHandlers$(
        SHandlers$:ServiceHandler$<unknown> | ServiceHandler$<unknown>[],
        keepAlive:number=0
    ):void{

        SHandlers$ = (Array.isArray(SHandlers$)) ? SHandlers$ : [SHandlers$];
        
        //keepAlive no puede ser negativa
        if (keepAlive < 0) {
            throw "la variable keepAlive es menor a 0";
        }

        while (SHandlers$.length > keepAlive) {
            const idxH = SHandlers$.length - 1; 
            
            //desuscribe TODO en el SHamdler de contexto
            SHandlers$[idxH].mapSubscripHandlers.forEach((subHandler, key)=>{   
                if (subHandler.subscription.closed == false) {
                    subHandler.subscription.unsubscribe();
                }                
            });

            //elimina todo el Map diccionario del SHandler en contexto
            SHandlers$[idxH].mapSubscripHandlers.clear();

            //eliminar la referencia del observable
            SHandlers$[idxH].setObservable(null);            

            SHandlers$.pop();
        }        
    }

}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*class ServiceBehaviorHandler$*/
//permite administrar observables a partir de behaviors
export class ServiceBehaviorHandler$<T, TFilterBhHandler> extends ServiceHandler$<T> {

    private behavior:BehaviorSubject< TFilterBhHandler | null >;

    constructor(){
        super();
        this.behavior = null;
    }


    //================================================================
    /*setBehavior()*/
    //actualiza un el objeto de la propiedad this._behavior
    //
    //IMPORTANTE: la propiedad this._behavior NO usa metodo  set  
    //tradicional ya que se requiere hacer varias modificaciones 
    //en los metodos @override de las clases hijas que los
    //metodos accesro no lo permiten
    //
    //Parametros:
    //
    //updatedBehavior: el behavior actualizado
    //
    public setBehavior(
        updatedBehavior:BehaviorSubject<TFilterBhHandler | null>
    ):void{
        this.behavior = updatedBehavior;
    }

    /*getBehavior()*/
    //devuelve el objeto de la propiedad this._behavior
    //
    //IMPORTANTE: la propiedad this._behavior NO usa metodo  get  
    //tradicional ya que se requiere hacer varias modificaciones 
    //en los metodos @override de las clases hijas que los
    //metodos accesro no lo permiten
    //
    //Parametros:
    //
    //idxMultiH: el index del behabior a devolver que esta almacenado 
    //en el contenedor this.multiModelSHandlers$
    public getBehavior():BehaviorSubject<TFilterBhHandler | null> {
        return this.behavior; 
    }

    //================================================================
    /*nextFilterBh()*/
    //encapsula la logica de realizar una nueva 
    //solicitud de observable al behavior
    //
    //Parametros:
    //
    //BhFilter: el filtro a cargar con el metodo next()
    public nextFilterBh(BhFilter:TFilterBhHandler):void{
        this.behavior.next(BhFilter);
        return;
    }

    /*getBhFilter()*/
    //obtiene el BhFilter asociado actualmente al behavior 
    public getBhFilter():TFilterBhHandler{  
        return this.behavior.value;
    }

    //================================================================
    /*adaptServiceBehaviorHandler$()*/
    //adapta un manejador de clase hija a esta clase padre, quitando las 
    //propiedades exclusivas de la clase hija
    //
    //propiedades:
    //handler$: manejador hijo a adaptar
    protected adaptServiceBehaviorHandler$(handler$:any):ServiceBehaviorHandler$<T, TFilterBhHandler>{
        
        //compara laas propiedades del padre y del hijo
        for (const pKey in this) {
            for (const cKey in handler$) {
                //elimina las propiedades que no coincidan
                if (pKey != cKey) {
                    //---Cuidado delete  esta generando error de compilacion---
                    delete handler$[cKey];
                }
            }
        }
        return handler$ as ServiceBehaviorHandler$<T, TFilterBhHandler>;
    }

}
