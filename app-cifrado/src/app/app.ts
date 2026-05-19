import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  archivo!: File;
  archivoCifrado!: Blob;
  archivoDescifrado!: Blob;

  claveTexto = '';
  mensaje = '';

  seleccionarArchivo(event: any) {
    this.archivo = event.target.files[0];
  }

  async obtenerClave() {
    const encoder = new TextEncoder();
    const data = encoder.encode(this.claveTexto);

    const hash = await crypto.subtle.digest('SHA-256', data);

    return crypto.subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async cifrarArchivo() {
    if (!this.archivo || !this.claveTexto) {
      this.mensaje = 'Selecciona un archivo y escribe una clave.';
      return;
    }

    const clave = await this.obtenerClave();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const buffer = await this.archivo.arrayBuffer();

    const cifrado = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      clave,
      buffer
    );

    this.archivoCifrado = new Blob([iv, new Uint8Array(cifrado)]);
    this.descargar(this.archivoCifrado, this.archivo.name + '.enc');

    this.mensaje = 'Archivo cifrado correctamente.';
  }

  async descifrarArchivo() {
    if (!this.archivo || !this.claveTexto) {
      this.mensaje = 'Selecciona un archivo cifrado y escribe la clave.';
      return;
    }

    const clave = await this.obtenerClave();
    const buffer = await this.archivo.arrayBuffer();

    const iv = buffer.slice(0, 12);
    const datos = buffer.slice(12);

    try {
      const descifrado = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        clave,
        datos
      );

      this.archivoDescifrado = new Blob([descifrado]);
      this.descargar(this.archivoDescifrado, 'descifrado_' + this.archivo.name.replace('.enc', ''));

      this.mensaje = 'Archivo descifrado correctamente.';
    } catch {
      this.mensaje = 'Error: clave incorrecta o archivo inválido.';
    }
  }

  descargar(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = nombre;
    a.click();

    URL.revokeObjectURL(url);
  }
}