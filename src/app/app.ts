import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as openpgp from 'openpgp';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  archivo!: File;

  algoritmo = 'aes';

  claveTexto = '';

  mensaje = '';

  nombre = '';

  correo = '';

  clavePublicaPGP = '';

  clavePrivadaPGP = '';

  seleccionarArchivo(event: any) {

    this.archivo = event.target.files[0];

    this.mensaje = this.archivo
      ? `Archivo seleccionado: ${this.archivo.name}`
      : '';
  }

  async obtenerClaveAES() {

    const encoder = new TextEncoder();

    const data = encoder.encode(this.claveTexto);

    const hash = await crypto.subtle.digest(
      'SHA-256',
      data
    );

    return crypto.subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async generarClavesPGP() {

    if (!this.nombre || !this.correo) {

      this.mensaje =
        'Ingresa nombre y correo para generar las claves PGP.';

      return;
    }

    try {

      const claves = await openpgp.generateKey({

        type: 'rsa',

        rsaBits: 2048,

        userIDs: [
          {
            name: this.nombre,
            email: this.correo
          }
        ],

        format: 'armored'
      });

      this.clavePublicaPGP =
        claves.publicKey;

      this.clavePrivadaPGP =
        claves.privateKey;

      this.mensaje =
        'Claves PGP generadas correctamente.';

    } catch (error) {

      console.error(error);

      this.mensaje =
        'Error al generar claves PGP.';
    }
  }

  async cifrarArchivo() {

    if (this.algoritmo === 'aes') {

      await this.cifrarAES();

    } else {

      await this.generarClavesPGP();
    }
  }

  async descifrarArchivo() {

    if (this.algoritmo === 'aes') {

      await this.descifrarAES();

    } else {

      this.mensaje =
        'Usa Kleopatra para cifrado y descifrado PGP.';
    }
  }

  async cifrarAES() {

    if (!this.archivo || !this.claveTexto) {

      this.mensaje =
        'Selecciona un archivo y escribe una clave.';

      return;
    }

    try {

      const clave =
        await this.obtenerClaveAES();

      const iv =
        crypto.getRandomValues(
          new Uint8Array(12)
        );

      const buffer =
        await this.archivo.arrayBuffer();

      const cifrado =
        await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv
          },
          clave,
          buffer
        );

      const resultado =
        new Blob([
          iv,
          new Uint8Array(cifrado)
        ]);

      this.descargarArchivo(
        resultado,
        this.archivo.name + '.aes'
      );

      this.mensaje =
        'Archivo cifrado correctamente con AES-GCM.';

    } catch (error) {

      console.error(error);

      this.mensaje =
        'Error al cifrar con AES-GCM.';
    }
  }

  async descifrarAES() {

    if (!this.archivo || !this.claveTexto) {

      this.mensaje =
        'Selecciona un archivo cifrado y escribe la clave.';

      return;
    }

    try {

      const clave =
        await this.obtenerClaveAES();

      const buffer =
        await this.archivo.arrayBuffer();

      const bytes =
        new Uint8Array(buffer);

      const iv =
        bytes.slice(0, 12);

      const datos =
        bytes.slice(12);

      const descifrado =
        await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv
          },
          clave,
          datos
        );

      this.descargarArchivo(
        new Blob([descifrado]),
        'descifrado_' +
        this.archivo.name.replace('.aes', '')
      );

      this.mensaje =
        'Archivo descifrado correctamente con AES-GCM.';

    } catch (error) {

      console.error(error);

      this.mensaje =
        'Clave incorrecta o archivo inválido.';
    }
  }

  descargarClavePublica() {

    if (!this.clavePublicaPGP) {

      this.mensaje =
        'Primero genera las claves PGP.';

      return;
    }

    try {

      const blob =
        new Blob(
          [this.clavePublicaPGP],
          {
            type: 'application/pgp-keys'
          }
        );

      const nombreArchivo =
        `${this.nombre}_${this.correo}_publica.asc`
          .replace(/@/g, '_')
          .replace(/\s+/g, '_');

      this.descargarArchivo(
        blob,
        nombreArchivo
      );

      this.mensaje =
        'Clave pública descargada correctamente.';

    } catch (error) {

      console.error(error);

      this.mensaje =
        'Error al descargar la clave pública.';
    }
  }

  descargarClavePrivada() {

    if (!this.clavePrivadaPGP) {

      this.mensaje =
        'Primero genera las claves PGP.';

      return;
    }

    try {

      const blob =
        new Blob(
          [this.clavePrivadaPGP],
          {
            type: 'application/pgp-keys'
          }
        );

      const nombreArchivo =
        `${this.nombre}_${this.correo}_privada.asc`
          .replace(/@/g, '_')
          .replace(/\s+/g, '_');

      this.descargarArchivo(
        blob,
        nombreArchivo
      );

      this.mensaje =
        'Clave privada descargada correctamente.';

    } catch (error) {

      console.error(error);

      this.mensaje =
        'Error al descargar la clave privada.';
    }
  }

  descargarArchivo(
    blob: Blob,
    nombre: string
  ) {

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement('a');

    a.href = url;

    a.download = nombre;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }
}