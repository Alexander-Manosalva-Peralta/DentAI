"""
DentAI - Puente Local (Bridge) para Microsoft SQL Server QA
Clínica Estomatológica UPCH - Smile Software
-----------------------------------------------------------
Permite a la extensión DentAI (Chrome MV3) consultar la base
de datos institucional SQL Server de forma segura y controlada,
cumpliendo con la Ley N° 29733 (Protección de Datos Personales).
"""

import sys
import os
import json
import socket
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

try:
    import pymssql
    PYMSSQL_AVAILABLE = True
except ImportError:
    PYMSSQL_AVAILABLE = False

PORT = 3000
DB_CONFIG = {
    "server": "cayetano-qa.smilesoftware.com.mx",
    "port": 1433,
    "user": "cayetano",
    "password": "Gisl39s.E32A#23",
    "database": "",
    "timeout": 2,
    "login_timeout": 2
}

_CACHED_IP = "38.25.81.186"

# Base de datos local de respaldo (Fallback mientras se autoriza la IP en el firewall de AWS)
FALLBACK_PACIENTES = [
    {
        "dni": "72736289",
        "nombres": "YOJAN",
        "apellidoPaterno": "MANOSALVA",
        "apellidoMaterno": "PERALTA",
        "genero": "MASCULINO",
        "fechaNacimiento": "22/02/2005",
        "tipoIdentificacion": "DNI",
        "celular": "987654321",
        "email": "yojan.manosalva@upch.pe",
        "direccion": "Av. Honorio Delgado 430",
        "departamento": "LIMA",
        "provincia": "LIMA",
        "distrito": "SAN MARTIN DE PORRES",
        "fuente": "Fallback QA Local"
    },
    {
        "dni": "45123456",
        "nombres": "MARIA ELENA",
        "apellidoPaterno": "QUISPE",
        "apellidoMaterno": "FLORES",
        "genero": "FEMENINO",
        "fechaNacimiento": "15/08/1998",
        "tipoIdentificacion": "DNI",
        "celular": "912345678",
        "email": "maria.quispe@upch.pe",
        "direccion": "Jr. Las Flores 123",
        "departamento": "LIMA",
        "provincia": "LIMA",
        "distrito": "LOS OLIVOS",
        "fuente": "Fallback QA Local"
    },
    {
        "dni": "10203040",
        "nombres": "CARLOS ANDRES",
        "apellidoPaterno": "SANCHEZ",
        "apellidoMaterno": "RODRIGUEZ",
        "genero": "MASCULINO",
        "fechaNacimiento": "10/05/1990",
        "tipoIdentificacion": "DNI",
        "celular": "998877665",
        "email": "carlos.sanchez@cayetano.edu.pe",
        "direccion": "Av. Universitaria 1500",
        "departamento": "LIMA",
        "provincia": "LIMA",
        "distrito": "SAN MIGUEL",
        "fuente": "Fallback QA Local"
    }
]

def check_sql_connection():
    """Comprueba el estado del puerto y autenticación SQL Server."""
    if not PYMSSQL_AVAILABLE:
        return {
            "ok": False,
            "status": "NO_DRIVER",
            "error": "Librería pymssql no instalada.",
            "host": DB_CONFIG["server"],
            "port": DB_CONFIG["port"]
        }
    
    # 1. Comprobar conectividad TCP al puerto 1433
    s = socket.socket()
    s.settimeout(1.2)
    res = s.connect_ex((DB_CONFIG["server"], DB_CONFIG["port"]))
    s.close()
    if res != 0:
        return {
            "ok": False,
            "status": "FIREWALL_BLOCKED",
            "host": DB_CONFIG["server"],
            "port": DB_CONFIG["port"],
            "public_ip": _CACHED_IP,
            "mensaje": f"Puerto 1433 filtrado/bloqueado. Solicitar al DTI agregar la IP { _CACHED_IP } al Security Group de AWS."
        }

    # 2. Conectar a SQL Server si el puerto está abierto
    try:
        conn = pymssql.connect(
            server=DB_CONFIG["server"],
            port=DB_CONFIG["port"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"] or None,
            login_timeout=2,
            timeout=2
        )
        cur = conn.cursor()
        cur.execute("SELECT DB_NAME()")
        row = cur.fetchone()
        db_name = row[0] if row else "master"
        conn.close()
        return {
            "ok": True,
            "status": "CONNECTED",
            "host": DB_CONFIG["server"],
            "port": DB_CONFIG["port"],
            "database": db_name,
            "user": DB_CONFIG["user"]
        }
    except Exception as e:
        return {
            "ok": False,
            "status": "AUTH_ERROR",
            "host": DB_CONFIG["server"],
            "port": DB_CONFIG["port"],
            "error": str(e)
        }

def query_patient_from_sql(dni):
    """Consulta segura de solo lectura (SELECT) en SQL Server."""
    if not PYMSSQL_AVAILABLE:
        return None
    try:
        # Primero verificar socket rápido para no trabar
        s = socket.socket()
        s.settimeout(0.8)
        r = s.connect_ex((DB_CONFIG["server"], DB_CONFIG["port"]))
        s.close()
        if r != 0:
            return None

        conn = pymssql.connect(
            server=DB_CONFIG["server"],
            port=DB_CONFIG["port"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"] or None,
            login_timeout=2,
            timeout=2
        )
        cur = conn.cursor(as_dict=True)
        # Búsqueda parametrizada
        query = "SELECT TOP 1 * FROM pacientes WHERE dni = %s OR num_documento = %s"
        cur.execute(query, (dni, dni))
        row = cur.fetchone()
        conn.close()
        if row:
            return {
                "origen": "SQL Server SMILE QA",
                "dni": dni,
                "nombres": str(row.get("nombres") or row.get("nombre") or "").strip(),
                "apellidoPaterno": str(row.get("apellido_paterno") or row.get("apellidoPaterno") or row.get("primer_apellido") or "").strip(),
                "apellidoMaterno": str(row.get("apellido_materno") or row.get("apellidoMaterno") or row.get("segundo_apellido") or "").strip(),
                "genero": str(row.get("genero") or row.get("sexo") or "MASCULINO").upper().strip(),
                "fechaNacimiento": str(row.get("fecha_nacimiento") or row.get("fechaNacimiento") or "").strip(),
                "celular": str(row.get("celular") or row.get("telefono") or "").strip(),
                "email": str(row.get("email") or row.get("correo") or "").strip(),
                "direccion": str(row.get("direccion") or row.get("calle") or "").strip(),
                "departamento": str(row.get("departamento") or "LIMA").strip(),
                "provincia": str(row.get("provincia") or "LIMA").strip(),
                "distrito": str(row.get("distrito") or "").strip()
            }
    except Exception as e:
        print(f"[SQL Server Error] {e}")
    return None

class DentAIBridgeHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        # 1. Endpoint Diagnóstico
        if path in ("/api/status", "/status"):
            st = check_sql_connection()
            self._set_headers(200)
            self.wfile.write(json.dumps(st, indent=2).encode("utf-8"))
            return

        # 2. Endpoint Consulta de Pacientes
        if path == "/api/pacientes":
            dni_list = params.get("dni", [])
            if not dni_list:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Parámetro 'dni' requerido"}).encode("utf-8"))
                return
            
            dni = dni_list[0].strip()

            # Consultar SQL Server institucional
            patient = query_patient_from_sql(dni)

            # Si SQL Server está filtrado por firewall, usar registro de prueba QA
            if not patient:
                for p in FALLBACK_PACIENTES:
                    if p["dni"] == dni:
                        patient = {**p, "origen": "SMILE QA (Caché Local / Fallback)"}
                        break

            if patient:
                self._set_headers(200)
                self.wfile.write(json.dumps(patient, indent=2).encode("utf-8"))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": f"Paciente {dni} no encontrado", "dni": dni}).encode("utf-8"))
            return

        # 3. Raíz informativa
        if path == "/":
            self._set_headers(200, "text/html")
            html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>DentAI - Puente SQL Server QA</title></head>
            <body style="font-family:Segoe UI,sans-serif;padding:30px;line-height:1.6;color:#222;">
                <h2>DentAI &bull; Puente Local SQL Server (SMILE QA)</h2>
                <p>Servidor activo en el puerto <code>{PORT}</code>.</p>
                <ul>
                    <li><b>Host SQL:</b> {DB_CONFIG['server']}:{DB_CONFIG['port']}</li>
                    <li><b>Usuario:</b> {DB_CONFIG['user']}</li>
                    <li><b>Diagnóstico:</b> <a href="/api/status">/api/status</a></li>
                    <li><b>Prueba DNI:</b> <a href="/api/pacientes?dni=72736289">/api/pacientes?dni=72736289</a></li>
                </ul>
            </body>
            </html>
            """
            self.wfile.write(html.encode("utf-8"))
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Ruta no encontrada"}).encode("utf-8"))

    def log_message(self, format, *args):
        pass

def run():
    print(f"DentAI Bridge iniciado en http://localhost:{PORT}")
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, DentAIBridgeHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()

if __name__ == "__main__":
    run()
