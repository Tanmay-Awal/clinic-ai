import os

def scan_dir(path, ignore_dirs):
    tree = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        level = root.replace(path, '').count(os.sep)
        indent = ' ' * 4 * (level)
        tree.append(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            tree.append(f"{subindent}{f}")
    return '\n'.join(tree)

ignore = ['.git', 'node_modules', '.next', 'dist', 'build', '.turbo', '.agent', '.serena']
clinic_tree = scan_dir('d:\\Clinic Development Sales', ignore)
hueman_tree = scan_dir('D:\\HuemanAI Development Sales', ignore)

with open('d:\\Clinic Development Sales\\scratch\\tree_structure.txt', 'w', encoding='utf-8') as f:
    f.write("Clinic Development Sales:\n")
    f.write(clinic_tree)
    f.write("\n\nHuemanAI Development Sales:\n")
    f.write(hueman_tree)

print("Tree structure written to scratch/tree_structure.txt")
