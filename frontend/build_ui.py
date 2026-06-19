import os

target_file = r"c:\Users\DELL\Desktop\Honey-Profile-Project\frontend\src\pages\HoneyShieldV2.jsx"
workspace_dir = r"c:\Users\DELL\Desktop\Honey-Profile-Project\frontend"

with open(target_file, "r", encoding="utf-8") as f:
    lines = f.readlines()

part1 = "".join(lines[:603])

with open(os.path.join(workspace_dir, "part2.jsx"), "r", encoding="utf-8") as f:
    part2 = f.read()

with open(os.path.join(workspace_dir, "part3.jsx"), "r", encoding="utf-8") as f:
    part3 = f.read()
    
with open(os.path.join(workspace_dir, "part4.jsx"), "r", encoding="utf-8") as f:
    part4 = f.read()

with open(target_file, "w", encoding="utf-8") as f:
    f.write(part1)
    f.write("\n")
    f.write(part2)
    f.write("\n")
    f.write(part3)
    f.write("\n")
    f.write(part4)
    f.write("\n")

print(f"Rebuilt {target_file}")
