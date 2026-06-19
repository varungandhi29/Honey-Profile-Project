import re

file_path = r"c:\Users\DELL\Desktop\Honey-Profile-Project\frontend\patch2.py"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# get new_dashboard content
match = re.search(r'new_dashboard = \"\"\"(.*?)\"\"\"\n\ncontent = ', code, re.DOTALL)
if match:
    new_dashboard = match.group(1)
    
    target_path = r"c:\Users\DELL\Desktop\Honey-Profile-Project\frontend\src\pages\DeceptionDashboard.jsx"
    with open(target_path, "r", encoding="utf-8") as f:
        target_content = f.read()
        
    # replace 'export function DeceptionDashboard...' to end of file with 'export ' + new_dashboard
    new_content = re.sub(
        r'export function DeceptionDashboard\(\{ engine, onLogout \}\) \{.*',
        'export ' + new_dashboard,
        target_content,
        flags=re.DOTALL
    )
    
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    print("Patch successfully applied to DeceptionDashboard.jsx")
else:
    print("Failed to extract new_dashboard string from patch2.py")
