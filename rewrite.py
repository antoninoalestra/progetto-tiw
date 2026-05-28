import sys

msg = sys.stdin.read().strip()
mapping = {
    'fix vari': 'fix: resolve various minor bugs',
    'cambiamento architetturale completo': 'refactor: complete architectural overhaul',
    'fix grafico login': 'fix: resolve UI layout bugs in login page',
    'piccoli fix frontend': 'fix: resolve minor frontend issues',
    'rebranding design frontend': 'style: rebrand frontend design',
    'Revisione README': 'docs: revise README documentation',
    'rimozione residui websocket': 'refactor: clean up residual websocket logic',
    'rimozione websocket': 'refactor: remove websocket functionality',
    'implementzione divione spesa personalizzata e miglioramento grafica frontend': 'feat: implement custom expense split and improve frontend UI',
    'aggiunta gruppi con grafici di spesa, e miglioramento README.md': 'feat: add groups with expense charts and improve README',
    'miglioramento grafica, e correzione funzionalità export pdf': 'feat: improve UI and fix PDF export functionality',
    'miglioramento generale sia frontend che backend, manca da finirela parte di frontend da mobile': 'feat: improve frontend and backend general stability'
}

for old, new_msg in mapping.items():
    if msg.startswith(old):
        print(new_msg)
        sys.exit(0)

print(msg)
