import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from "@angular/forms";

import { AuthService } from 'src/app/services/firebase/auth/auth.service';

import { IDoc$, IpathDoc$, IRunFunSuscribe } from 'src/app/services/firebase/_Util';

import { IProducto, Producto } from '../../models/firebase/productos/producto';
import { IValQ_Producto, Iv_PreLeer_Producto } from '../../services/firebase/productos/productoCtrl_Util';
import { ProductoService } from '../../services/firebase/productos/producto.service';

import { emb_SubColeccion, Iemb_SubColeccion } from 'src/app/models/firebase/productos/emb_subColeccion';

import { Rol } from 'src/app/models/firebase/rols/rol';
import { RolService } from 'src/app/services/firebase/rols/rol.service';

import { IValQ_emb_SubColeccion, Iv_PreLeer_emb_SubColeccion } from '../../services/firebase/productos/emb_subcoleccionCtrl_Util';
import { emb_subColeccionService } from 'src/app/services/firebase/productos/emb_subcoleccion.service';
import { ETipoAuth } from 'src/app/services/firebase/auth/authNoSocialCtrl_Util';
import { AuthNoSocial } from 'src/app/models/firebase/auth/authNoSocial';



@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit, OnDestroy {

  //================================================
  //contenedor de documento para trabajo en plantilla
  public Producto:Producto; 

  public ProductoCtrl$:IDoc$<Producto, IProducto<IValQ_Producto>>;
  //public Producto_pathDocCtrl$:IpathDoc$<Producto>;

  public Emb_SubColeccionCtrl$:IDoc$<emb_SubColeccion, Iemb_SubColeccion<IValQ_emb_SubColeccion>>;

  //array de documentos obtenidos de la bd
  //de acuerdo a los filtros aplicados
  public productosList:Producto[];

  public Productos_Path_Id:Producto | null;

  //================================================
  //Campos del formulario para crear o editar documento
  public formCrearOActualizar:FormGroup; 
  //================================================

  //================================================================================================================================
  constructor(public _AuthService:AuthService,
              public _RolService:RolService,
              public _ProductoService:ProductoService,
              public _emb_SubColeccionService:emb_subColeccionService,
             
             ) {
 
    //================================================
    //preparar la inicializacion de objetos principales
    this.Producto = new Producto();

    this.productosList = []; 
    //================================================
    //inicializacion de controls
    this.ProductoCtrl$ = null;
    //this.Producto_pathDocCtrl$ = null;
    this.Emb_SubColeccionCtrl$ = null;

    //================================================
    //inicializacion de primeras consultas (opcional):

    this.ProductoCtrl$ = this._ProductoService.get$(this.ProductoCtrl$, this.RFS_Productos, null);

    //this.Producto_pathDocCtrl$ = this._ProductoService.getProducto_pathDoc$(this.Producto_pathDocCtrl$, this.RFS_Productos_pathDoc, null);

    //TEST--------------------------------------------------------------------------

    // let _pathDocs = ["Productos/000001-bb137223430a5d9f", 
    //                 "/Productos/000002-a76299ccf1d7ce9b",
    //                 "/Productos/000003-ab3e840a0dff7f5d",
    //                 "/Productos/000004-9a434806011343ce",
    //                 "/Productos/000005-8d5b017aa032ebc3",
    //                 "/Productos/000006-ba0f544bb2e38778"
    //                 ]
    // let _pathDocs = "Productos/000001-bb137223430a5d9f";
    // let control$ = this._ProductoService.populate(null, this.RFS_poblar, _pathDocs,4);
    // setTimeout(()=>{
    //   this._ProductoService.populate(control$, this.RFS_poblar);
    // }, 10000);
    //================================================

  }

  //================================================================================================================================
  //Hooks de componente angular:
  //================================================================================================================================
  ngOnInit() {   
    //================================================
    //configurar las opciones del formulario
    let docTpl = new Producto();
    let formControls:any = <IProducto<any>>{
      // _id: new FormControl(docTpl._id),
      nombre : new FormControl(docTpl.nombre),
      categoria : new FormControl(docTpl.categoria),
      precio : new FormControl(docTpl.precio)    
    };

    this.formCrearOActualizar = new FormGroup(formControls); 
    //================================================
  } 

  ngOnDestroy(){
    //================================================
    //desuscribirse de todos los observables
    this._ProductoService.unsubscribeAll$([this.ProductoCtrl$], []);
    this._emb_SubColeccionService.unsubscribeAll$([this.Emb_SubColeccionCtrl$],[]);
    //================================================
  }

  //================================================================================================================================
  //declarar filtros (se debe usar metodo getters para poder crear
  //objetos de filtrado independientes, tomando una base como referencia)
  private getFiltroProductosTodo():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = {
      _id:{
        _orden:"asc"
      }
    };
    return valQuery;
  } 

  private getFiltroProductosPorNombre():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = {
      nombre:{
        ini:"ha",
        _orden:"asc"
      }
    };
    return valQuery;
  } 

  private getFiltroProductosPorPrecio():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = {
      precio:{
        //val:100 //esto si quiero igualdad
        min:300,
        _orden:"asc"
      }
    };
    return valQuery;
  } 

  private getFiltroProductosPorRuedas():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = {
      map_miscelanea:{
        ruedas:{
          val:2,
          _orden:"asc"
        }
      }
    };
    return valQuery;
  } 

  private getFiltroProductosArrayNormal():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = null;
    return valQuery;
  } 

  private getFiltroProductosId():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = {
      _id:{
        val:"000003-ab3e840a0dff7f5d",
        _orden:"asc"
      }

    };
    return valQuery;
  } 

  //================================================================
  //propiedades metodos de ejecucion next y error para las suscripciones
  //dentro de cada una se ejecuta el codigo una vez leido los docs
  //desde la base de datos (sea poruna nueva solicitud query o por algun cambio 
  //detectado por los observables asignados)

  private RFS_Productos:IRunFunSuscribe<Producto> = {
    next:(docRes:Producto[])=>{
      this.productosList = <Producto[]>this._ProductoService.ModeloCtrl_Util.preLeerDocs(docRes, this.getDatosPreLeer());  
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_Productos_pathDoc:IRunFunSuscribe<Producto> = {
    next:(docRes:Producto)=>{
      this.Productos_Path_Id = <Producto>this._ProductoService.ModeloCtrl_Util.preLeerDocs(docRes, this.getDatosPreLeer());
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_Emb_SubColeccion:IRunFunSuscribe<any> = {
    next:(docRes:any[])=>{
      let test = docRes;
      let a ="";
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_poblar:IRunFunSuscribe<any> = {
    next:(docRes:any[])=>{
      let test = docRes;
      let a ="";
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  

  
  //================================================================================================================================
  //paginacion reactiva (se autogestiona de acuerdo al tipo de paginacion):

  public paginarAnterior(){

    this.ProductoCtrl$ = this._ProductoService.paginar$(this.ProductoCtrl$, "previo");
  }

  public paginarSiguiente(){

    this.ProductoCtrl$ = this._ProductoService.paginar$(this.ProductoCtrl$, "siguiente");
  }

  //================================================================
  //metodos que ejecutan nuevas consultas
  //ES MEJOR USAR METODOS INDEPENDIENTES ESTO ES SOLO PRUEBA

  public consultarProducto(opc: "Todo"|"_id"|"Nombre"|"Precio"|"Ruedas"|"ArrayNormal"|"SubCol"|"SubColGrup"){
    switch (opc) {
      case "Todo":
        this.ProductoCtrl$ = this._ProductoService.get$(this.ProductoCtrl$, this.RFS_Productos, this.getFiltroProductosTodo());
        break;
      case "_id":
        this.ProductoCtrl$ = this._ProductoService.getId$(this.ProductoCtrl$, this.RFS_Productos, this.getFiltroProductosId());
        break;        
      case "Nombre":
        this.ProductoCtrl$ = this._ProductoService.getPorNombre$(this.ProductoCtrl$, this.RFS_Productos, this.getFiltroProductosPorNombre());
        break;  
      case "Precio":
        this.ProductoCtrl$ = this._ProductoService.getPorPrecio$(this.ProductoCtrl$, this.RFS_Productos, this.getFiltroProductosPorPrecio());
        break;
      case "Ruedas":
        this.ProductoCtrl$ = this._ProductoService.getPorMiscRuedas$(this.ProductoCtrl$, this.RFS_Productos, this.getFiltroProductosPorRuedas());
        break;  

      case "ArrayNormal":
        this.ProductoCtrl$ = this._ProductoService.getPorArrayNormal$(this.ProductoCtrl$, this.RFS_Productos, null);    
        break;
      case "SubCol":
        let path_embBaseNormal = this.productosList[0]._pathDoc; //opcion basica
        this.Emb_SubColeccionCtrl$ = this._emb_SubColeccionService.get$(this.Emb_SubColeccionCtrl$, this.RFS_Emb_SubColeccion, null, path_embBaseNormal );    
        break;           
      case "SubColGrup":
        let path_embBaseGrup = null;
        this.Emb_SubColeccionCtrl$ = this._emb_SubColeccionService.get$(this.Emb_SubColeccionCtrl$, this.RFS_Emb_SubColeccion, null, path_embBaseGrup );    
        break;        
    
      default:
        break;
    }
  }
  //================================================================================================================================
  //================================================================================================================================

  //a modo de prueba
  private getDatosPreLeer():Iv_PreLeer_Producto{
    return {
      imp : 20
    };
  }

  //================================================================================================================================

  singUpEmail(){
    const credencial = <AuthNoSocial>{
      email: "carlos@carlos.com",
      pass : "123456"
    }
    
    this._AuthService.signUpNoSocial(credencial)
    .then((result)=>{
      let p = result;
    })
    .catch((err)=>{
      console.log(err);
    });
  }

  login(tipo:ETipoAuth){
    const credencial = <AuthNoSocial>{
      email: "andres@andres.com",
      pass : "987000"
    }
    this._AuthService.login(tipo, credencial)
    .then((result)=>{
      let p = result;
    })
    .catch((err)=>{
      console.log(err);
    });
  }

  logout(){
    this._AuthService.logout()
    .then(()=>{

    })
    .catch((err)=>{
      console.log(err);
    });
  }
  //================================================================================================================================

  public crearOActualizar(docAnterior?:Producto){

    let doc = <Producto>this.formCrearOActualizar.value;

    //================================================
    //determinar si es actualizar o crear (dependiendo 
    //si se recibe docAnterior)
    if (docAnterior) {
      this._ProductoService.actualizar(doc)
      .then((docActualizado)=>{
        console.log("987Actualizado: " + docActualizado);
        this.formCrearOActualizar.reset();
      })
      .catch((error)=>{
        console.log("987 Error al Actualizalo: " + error);
      });           
    } else {
      this._ProductoService.crear(doc)
      .then((docCreado)=>{
        console.log("987Creado: " + docCreado);
        this.formCrearOActualizar.reset();
      })
      .catch((error)=>{
        console.log("987 Error al Crearlo: " + error);
      });      
    }    
    //================================================




  }

  crear_set(opc: "Col"|"subCol"){
    switch (opc) {
      case "Col":
        this._ProductoService.crear(<Producto>{}) //<Producto>{}solo para ejemplo
        .then(()=>{
          console.log("ya en el componente: ");
        })
        .catch(err=>{
          console.log("tratar el erro en el componente " + err);
        })
        break;

      case "subCol":
        const path_embBase = "Productos/16f1ec3ddfd-81de43de6700c3c7";
        this._emb_SubColeccionService.crear(<emb_SubColeccion>{}, path_embBase) //emb_SubColeccion>{}solo para ejemplo
        .then(()=>{
          console.log("ya en el componente: ");
        })
        .catch(err=>{
          console.log("tratar el erro en el componente " + err);
        })
        break;        
    
      default:
        break;
    }

  }

  editar(){
    this._ProductoService.actualizar(<Producto>{})//<Producto>{}solo para ejemplo
    .then(()=>{
      console.log("EDITADO ya en el componente: ");
    })
    .catch(err=>{
      console.log("EDITAR tratar el error en el componente " + err);
    })
  }

  eliminar(){
    this._ProductoService.eliminar("") //""solo para ejemplo
    .then(()=>{
      console.log("borrado ya en el componente: ");
    })
    .catch(err=>{
      console.log("borrado tratar el error en el componente " + err);
    })
  }

}

//================================================================================================================================
