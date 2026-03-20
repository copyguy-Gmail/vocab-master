import csv
import json
import re

def clean_and_split_vocabulary(csv_path):
    all_words = []
    # POS list for matching
    pos_list = r'(名詞|動詞|形容詞|副詞|代名詞|連接詞|介系詞|限定詞|所有格|疑問詞|介系詞|a|n|v|ad|prep|conj|pron|art|ph|int)'
    
    # Regex to catch: (some text) (number) (word) (POS) (rest of text)
    # Example: "成年人 33 beautiful 形容詞 美麗的"
    # match 1: "成年人"
    # match 2: "33"
    # match 3: "beautiful"
    # match 4: "形容詞"
    # match 5: "美麗的"
    split_pattern = re.compile(rf'(.*?)\s+(\d+)\s+([a-zA-Z\-]+)\s+{pos_list}\s+(.*)')

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = row['word'].strip()
            pos = row['part_of_speech'].strip()
            meaning = row['meaning'].strip()
            
            # Check if this row is already weirdly mixed
            match = split_pattern.match(meaning)
            if match:
                # Add word 1
                all_words.append({
                    "w": word,
                    "t": pos,
                    "m": match.group(1).strip()
                })
                # Add word 2
                all_words.append({
                    "w": match.group(3).strip(),
                    "t": match.group(4).strip(),
                    "m": match.group(5).strip()
                })
            else:
                # Just one word
                # Still might have extra numbers at the end? 
                # Let's clean numeric noise at the end of meaning
                meaning = re.sub(r'\s+\d+$', '', meaning)
                all_words.append({
                    "w": word,
                    "t": pos,
                    "m": meaning
                })
                
    return all_words

def deduplicate_and_sort(words):
    # Use tuple of (w, t, m) to deduplicate
    seen = set()
    unique_words = []
    for w in words:
        key = (w['w'].lower(), w['m'])
        if key not in seen:
            seen.add(key)
            unique_words.append(w)
    # Sort by word alphabetically
    unique_words.sort(key=lambda x: x['w'].lower())
    return unique_words

jh_cleaned = clean_and_split_vocabulary('JuniorHigh_Vocabulary.csv')
toeic_cleaned = clean_and_split_vocabulary('TOEIC_Vocabulary.csv')

# Handle case where TOEIC also has different POS markers
# Regex to see if TOEIC has the same mixed columns
# Actually TOEIC extraction had lines like:
# "4,able,a,能；可；會 19. absolute a 純粹的；完全"
toeic_split_pattern = re.compile(r'(.*?)\s+(\d+)\.\s+([a-zA-Z\-]+)\s+([a-z]+)\s+(.*)')

final_toeic = []
for w in toeic_cleaned:
    match = toeic_split_pattern.match(w['m'])
    if match:
        final_toeic.append({"w": w['w'], "t": w['t'], "m": match.group(1).strip()})
        final_toeic.append({"w": match.group(3).strip(), "t": match.group(4).strip(), "m": match.group(5).strip()})
    else:
        final_toeic.append(w)

jh_final = deduplicate_and_sort(jh_cleaned)
toeic_final = deduplicate_and_sort(final_toeic)

vocab_sets = {
    "junior_high": {
        "title": "國中必備 2000 單字",
        "data": jh_final
    },
    "toeic": {
        "title": "多益 TOEIC 單字",
        "data": toeic_final
    }
}

with open('words.js', 'w', encoding='utf-8') as f:
    f.write("const VOCAB_SETS = ")
    json.dump(vocab_sets, f, ensure_ascii=False, indent=2)
    f.write(";")

print(f"words.js 清理更新完成！國中單字: {len(jh_final)}, 多益單字: {len(toeic_final)}")
