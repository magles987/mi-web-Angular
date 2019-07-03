import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from "@angular/forms";
import { IProducto, Producto } from './models/productos';
import { ProductosService } from './services/productos.service';


@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {

  public formProductos:FormGroup;

  public productos:Producto[];

  public productosFiltrados:Producto[];

  public productosFiltradosDinamicos:Producto[];
  public productoNombreFiltro$;
  public productoPrecioFiltro$;
  public productoRuedasFiltro$;

  constructor(private _ProductosServices:ProductosService) {
    
  }

  ngOnInit() {
    //================================================================
    //configurar las opciones del formulario
    let formControls:any = <IProducto>{
      // $_id: new FormControl(''),
      nombre : new FormControl(''),
      categoria : new FormControl(''),
      precio : new FormControl('')    
    };

    this.formProductos = new FormGroup(formControls); 
    //================================================================
    //================================================================
    //Descargar los datos de la bd  

    this.productoNombreFiltro$ = this._ProductosServices.productoNombreFiltro$;
    this.productoPrecioFiltro$ = this._ProductosServices.productoPrecioFiltro$;
    this.productoRuedasFiltro$ = this._ProductosServices.productoRuedasFiltro$;
    
    this._ProductosServices.leerProductosFiltroDinamico().subscribe((dataRes)=>{
        this.productosFiltradosDinamicos = dataRes;
    });
    //================================================================

  }

  crear(){
    console.log(this.formProductos.value);
    let d = this._ProductosServices.crearProducto_set(this.formProductos.value);
    d.then(data=>{
      console.log("Bien987: " + data);
    })
    .catch(err=>{
      console.log(err);
    })
    this.formProductos.reset();
  }

  crear_set(){
    this._ProductosServices.crearProducto_set()
    .then(data=>{
      console.log("ya en el componente: " + data);
    })
    .catch(err=>{
      console.log("tratar el erro en el componente " + err);
    })
  }

  editar(){
    this._ProductosServices.actualizarProducto()
    .then(data=>{
      console.log("EDITADO ya en el componente: " + data);
    })
    .catch(err=>{
      console.log("EDITAR tratar el error en el componente " + err);
    })
  }


}
