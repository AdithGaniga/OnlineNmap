from flask import Flask, request, jsonify
from flask_cors import CORS
import nmap
import re
import threading
from typing import Dict, Optional


app = Flask(__name__)
CORS(app)

# Thread-safe scanner pool
scanner_pool: Dict[str, Optional[nmap.PortScanner]] = {}
scanner_lock = threading.Lock()

def validate_target(target: str) -> bool:
    """Validate target IP/hostname."""
    # Remove any dangerous characters
    if re.search(r'[;&|]', target):
        return False
    # Basic IP/hostname validation
    if re.match(r'^[a-zA-Z0-9.-]+$', target):
        return True
    return False

def get_scanner():
    """Get a scanner instance from the pool or create new one."""
    thread_id = str(threading.get_ident())
    with scanner_lock:
        if thread_id not in scanner_pool:
            scanner_pool[thread_id] = nmap.PortScanner()
        return scanner_pool[thread_id]

def requires_valid_target(f):
    def decorated_function(*args, **kwargs):
        data = request.get_json()
        if not data or 'target' not in data:
            return jsonify({'error': 'No target specified'}), 400
        target = data['target']
        if not validate_target(target):
            return jsonify({'error': 'Invalid target'}), 400
        return f(*args, **kwargs)
    return decorated_function

def parse_vulnerability_output(nm, host):
    """
    Parse vulnerability scan output into a structured format
    """
    vulnerabilities = []
    
    # Check for script output
    if 'script' in nm[host]:
        for script_id, script_output in nm[host]['script'].items():
            # Basic parsing to extract vulnerability information
            if 'vulscan' in script_id.lower():
                # Split output into individual vulnerability entries
                entries = str(script_output).split('\n')
                for entry in entries:
                    # Basic filtering to capture meaningful vulnerability info
                    if entry.strip() and not entry.startswith('----'):
                        vulnerabilities.append(entry.strip())
    
    return vulnerabilities

@app.route('/scan', methods=['POST'])
@requires_valid_target
def scan():
    data = request.get_json()
    target = data['target']
    scan_type = data.get('scan_type', 'fast')
    
    try:
        nm = get_scanner()
        
        # Prepare scan arguments based on type
        scan_args = {
            'fast': '-F',
            'version': '-sV',
            'full': '-p-',
            'os': '-O',
            'exploits': '-sV --script=vulscan/vulscan.nse'
        }.get(scan_type)
        
        if not scan_args:
            return jsonify({'error': 'Invalid scan type'}), 400
        
        # Perform the scan
        if scan_args is '-O':
            nm.scan(target, arguments=scan_args, sudo=True)
        else:
            nm.scan(target, arguments=scan_args)
        
        # Prepare results
        results = {
            'target': target,
            'hosts': []
        }
        
        for host in nm.all_hosts():
            host_info = {
                'ip': host,
                'state': nm[host].state(),
                'protocols': []
            }
            
            # Add port and service information
            for proto in nm[host].all_protocols():
                protocol_info = {
                    'name': proto,
                    'ports': []
                }
                
                ports = nm[host][proto].keys()
                for port in ports:
                    service = nm[host][proto][port]
                    port_info = {
                        'port': port,
                        'state': service['state']
                    }
                    
                    if 'name' in service:
                        port_info['service'] = service['name']
                    if 'version' in service and service['version']:
                        port_info['version'] = service['version']
                    
                    protocol_info['ports'].append(port_info)
                
                host_info['protocols'].append(protocol_info)
            
            # Parse and add vulnerabilities
            vulnerabilities = parse_vulnerability_output(nm, host)
            if vulnerabilities:
                host_info['vulnerabilities'] = vulnerabilities
            
            # Add OS detection if available
            if 'osmatch' in nm[host]:
                host_info['os_detection'] = [
                    {
                        'name': osmatch['name'],
                        'accuracy': osmatch['accuracy']
                    } for osmatch in nm[host]['osmatch']
                ]
            
            results['hosts'].append(host_info)
        
        return jsonify(results)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)