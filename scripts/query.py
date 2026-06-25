import json
import re

LOG_PATH = "C:/Users/dextop/.gemini/antigravity-ide/brain/68cb1529-3640-4830-bced-4c2b988ffb5e/.system_generated/logs/transcript.jsonl"

print("Searching transcript for modifications to HomePage.tsx...")

with open(LOG_PATH, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "HomePage.tsx" in line and ("write_to_file" in line or "replace_file_content" in line or "multi_replace_file_content" in line):
            try:
                data = json.loads(line)
                step = data.get("step_index")
                tool_calls = data.get("tool_calls", [])
                for tc in tool_calls:
                    target = tc.get("args", {}).get("TargetFile") or tc.get("args", {}).get("AbsolutePath") or ""
                    if "HomePage.tsx" in target:
                        print(f"Match found at Line {line_num}, Step {step}, Tool: {tc.get('name')}")
                        # If it is replace_file_content or write_to_file, we print a snippet
                        args = tc.get("args", {})
                        if "CodeContent" in args:
                            content = args["CodeContent"]
                            print(f"  CodeContent length: {len(content)}")
                            # Write it to a backup file so we can read it easily!
                            out_path = f"client_homepage_step_{step}.tsx"
                            with open(out_path, "w", encoding="utf-8") as out_f:
                                out_f.write(content)
                            print(f"  Wrote full file contents to {out_path}!")
                        elif "ReplacementContent" in args:
                            print(f"  ReplacementContent snippet: {args['ReplacementContent'][:200]}...")
            except Exception as e:
                print(f"Error parsing line {line_num}: {e}")
