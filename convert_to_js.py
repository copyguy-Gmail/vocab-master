import csv
import json

def csv_to_js_objects(csv_path):
    words = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Clean up cleanup noise from meaning (simple heuristic)
            meaning = row['meaning']
            if ' ' in meaning:
                # Many lines have "Number Word POS Meaning" mixed in
                # We try to keep only the first part before any other number/word pattern
                # But it's risky. Let's just strip whitespace.
                pass
            
            words.append({
                "w": row['word'],
                "t": row['part_of_speech'],
                "m": row['meaning']
            })
    return words

jh_words = csv_to_js_objects('JuniorHigh_Vocabulary.csv')
toeic_words = csv_to_js_objects('TOEIC_Vocabulary.csv')

vocab_sets = {
    "junior_high": {
        "title": "國中必備 2000 單字",
        "data": jh_words
    },
    "toeic": {
        "title": "多益 TOEIC 單字",
        "data": toeic_words
    }
}

with open('words.js', 'w', encoding='utf-8') as f:
    f.write("const VOCAB_SETS = ")
    json.dump(vocab_sets, f, ensure_ascii=False, indent=2)
    f.write(";")

print(f"words.js 更新完成！國中單字: {len(jh_words)}, 多益單字: {len(toeic_words)}")
