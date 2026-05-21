import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  archivo!: File;
  algoritmo = 'aes';
  claveTexto = '';
  mensaje = '';

  clavePublicaRSA!: CryptoKey;
  clavePrivadaRSA!: CryptoKey;

  seleccionarArchivo(event: any) {
    this.archivo = event.target.files[0];
    this.mensaje = this.archivo
      ? `Archivo seleccionado: ${this.archivo.name}`
      : '';
  }

  async obtenerClaveAES() {
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

  async generarClavesRSA() {
    const claves = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    );

    this.clavePublicaRSA = claves.publicKey;
    this.clavePrivadaRSA = claves.privateKey;

    this.mensaje = 'Claves RSA generadas correctamente.';
  }

  async cifrarArchivo() {
    if (this.algoritmo === 'aes') {
      await this.cifrarAES();
    } else {
      await this.cifrarRSA();
    }
  }

  async descifrarArchivo() {
    if (this.algoritmo === 'aes') {
      await this.descifrarAES();
    } else {
      await this.descifrarRSA();
    }
  }

  async cifrarAES() {
    if (!this.archivo || !this.claveTexto) {
      this.mensaje = 'Selecciona un archivo y escribe una clave.';
      return;
    }

    const clave = await this.obtenerClaveAES();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const buffer = await this.archivo.arrayBuffer();

    const cifrado = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      clave,
      buffer
    );

    const resultado = new Blob([iv, new Uint8Array(cifrado)]);
    this.descargarArchivo(resultado, this.archivo.name + '.aes');

    this.mensaje = 'Archivo cifrado con AES-GCM.';
  }

  async descifrarAES() {
    if (!this.archivo || !this.claveTexto) {
      this.mensaje = 'Selecciona un archivo cifrado y escribe la clave.';
      return;
    }

    try {
      const clave = await this.obtenerClaveAES();
      const buffer = await this.archivo.arrayBuffer();

      const iv = buffer.slice(0, 12);
      const datos = buffer.slice(12);

      const descifrado = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        clave,
        datos
      );

      this.descargarArchivo(
        new Blob([descifrado]),
        'descifrado_' + this.archivo.name.replace('.aes', '')
      );

      this.mensaje = 'Archivo descifrado con AES-GCM.';
    } catch {
      this.mensaje = 'Clave incorrecta o archivo inválido.';
    }
  }

  async cifrarRSA() {
    if (!this.archivo) {
      this.mensaje = 'Selecciona un archivo.';
      return;
    }

    if (!this.clavePublicaRSA) {
      await this.generarClavesRSA();
    }

    const claveAES = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const bufferArchivo = await this.archivo.arrayBuffer();

    const archivoCifrado = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      claveAES,
      bufferArchivo
    );

    const claveAESRaw = await crypto.subtle.exportKey('raw', claveAES);

    const claveCifradaRSA = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      this.clavePublicaRSA,
      claveAESRaw
    );

    const largoClave = new Uint8Array(4);
    new DataView(largoClave.buffer).setUint32(0, claveCifradaRSA.byteLength);

    const resultado = new Blob([
      largoClave,
      new Uint8Array(claveCifradaRSA),
      iv,
      new Uint8Array(archivoCifrado)
    ]);

    this.descargarArchivo(resultado, this.archivo.name + '.rsa');

    this.mensaje = 'Archivo cifrado con RSA-OAEP + AES-GCM.';
  }

  async descifrarRSA() {
    if (!this.archivo) {
      this.mensaje = 'Selecciona un archivo cifrado RSA.';
      return;
    }

    if (!this.clavePrivadaRSA) {
      this.mensaje = 'Primero debes tener las claves RSA generadas.';
      return;
    }

    try {
      const buffer = await this.archivo.arrayBuffer();
      const vista = new DataView(buffer);

      const largoClave = vista.getUint32(0);

      const claveCifrada = buffer.slice(4, 4 + largoClave);
      const iv = buffer.slice(4 + largoClave, 4 + largoClave + 12);
      const datos = buffer.slice(4 + largoClave + 12);

      const claveAESRaw = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        this.clavePrivadaRSA,
        claveCifrada
      );

      const claveAES = await crypto.subtle.importKey(
        'raw',
        claveAESRaw,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const descifrado = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        claveAES,
        datos
      );

      this.descargarArchivo(
        new Blob([descifrado]),
        'descifrado_' + this.archivo.name.replace('.rsa', '')
      );

      this.mensaje = 'Archivo descifrado con RSA-OAEP.';
    } catch {
      this.mensaje = 'No se pudo descifrar. Archivo o clave RSA inválida.';
    }
  }

  descargarArchivo(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = nombre;
    a.click();

    URL.revokeObjectURL(url);
  }
}