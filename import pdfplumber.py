import pdfplumber
import csv
import re
import os

# 定義路徑
downloads_path = r'C:\Users\chungyi\Downloads'
jh_pdf = os.path.join(downloads_path, '國中英文單字2000.pdf')
toeic_pdf = os.path.join(downloads_path, '全新制多益TOEIC必考單字3000 (1).pdf')

# 正規表達式
# TOEIC 格式範例: "1. abandon v 拋棄；遺棄"
regex_toeic = re.compile(r'(\d+)\.\s+([a-zA-Z\-]+)\s+([a-z]+)\s+(.+)')
# 國中單字格式範例: "1 adult 名詞 成年人"
regex_jh = re.compile(r'(\d+)\s+([a-zA-Z\-\s]+?)\s+(名詞|動詞|形容詞|副詞|代名詞|連接詞|介系詞|限定詞|所有格|疑問詞|介系詞)\s+(.+)')

def extract_to_csv(pdf_path, regex_pattern, output_csv):
    vocabulary_list = []
    
    if not os.path.exists(pdf_path):
        print(f"檔案不存在: {pdf_path}")
        return
        
    print(f"正在處理: {pdf_path}")
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                for line in text.split('\n'):
                    match = regex_pattern.search(line)
                    if match:
                        vocab_data = {
                            "id": match.group(1),
                            "word": match.group(2).strip(),
                            "part_of_speech": match.group(3).strip(),
                            "meaning": match.group(4).strip()
                        }
                        vocabulary_list.append(vocab_data)
    
    if vocabulary_list:
        with open(output_csv, 'w', encoding='utf-8-sig', newline='') as csv_file:
            fieldnames = ["id", "word", "part_of_speech", "meaning"]
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(vocabulary_list)
        print(f"成功輸出: {output_csv} (共 {len(vocabulary_list)} 個單字)")
    else:
        print(f"在 {pdf_path} 中未找到匹配的單字。")

# 1. 處理國中英文單字
extract_to_csv(jh_pdf, regex_jh, 'JuniorHigh_Vocabulary.csv')

# 2. 處理多益英文單字
extract_to_csv(toeic_pdf, regex_toeic, 'TOEIC_Vocabulary.csv')