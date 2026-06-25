<?php
// news.php — показывает данные из JSON на GitHub

// URL твоего JSON-файла
$url = 'https://gist.githubusercontent.com/Ryuven/6f3d13c7ce362d3e981ad5176d489263/raw/ab6263ffb54ac95fa154bf2839be36c2384d651c/news.json';

// Загружаем данные с GitHub
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Проверяем что загрузилось
if ($httpCode != 200 || empty($response)) {
    die('❌ Ошибка загрузки данных. Код: ' . $httpCode);
}

// Парсим JSON
$data = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    die('❌ Ошибка парсинга JSON: ' . json_last_error_msg());
}

// ========== ВЫВОД ==========

echo '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📰 Новости — Galelium Delivery</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        h1 {
            font-size: 24px;
            color: #1a1a1a;
            border-bottom: 2px solid #00a86b;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .item {
            padding: 16px 0;
            border-bottom: 1px solid #eee;
        }
        .item:last-child {
            border-bottom: none;
        }
        .item h3 {
            font-size: 18px;
            color: #222;
            margin-bottom: 6px;
        }
        .item p {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
        }
        .item .date {
            color: #999;
            font-size: 12px;
            margin-top: 4px;
        }
        .badge {
            display: inline-block;
            background: #e8f5e9;
            color: #2e7d32;
            font-size: 12px;
            padding: 2px 12px;
            border-radius: 12px;
        }
        .footer {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #ddd;
            font-size: 13px;
            color: #999;
            text-align: center;
        }
        .error {
            background: #ffebee;
            color: #c62828;
            padding: 16px;
            border-radius: 8px;
            border-left: 4px solid #c62828;
        }
        pre {
            background: #f8f8f8;
            padding: 16px;
            border-radius: 8px;
            overflow: auto;
            font-size: 12px;
            margin-top: 16px;
        }
    </style>
</head>
<body>
<div class="container">
    <h1>📰 Новости Galelium Delivery</h1>';

// Проверяем структуру данных
if (!is_array($data)) {
    echo '<div class="error">❌ Данные получены, но структура не распознана.</div>';
    echo '<pre>' . htmlspecialchars($response) . '</pre>';
} else {
    // Если данные — это массив новостей
    $items = [];
    
    // Вариант 1: если данные — это массив объектов
    if (isset($data[0]) && is_array($data[0])) {
        $items = $data;
    }
    // Вариант 2: если данные — объект с ключами
    else if (is_array($data) && !isset($data[0])) {
        $items = array_values($data);
    }
    // Вариант 3: если данные — одна новость
    else if (isset($data['title']) || isset($data['text'])) {
        $items = [$data];
    }
    
    if (empty($items)) {
        echo '<div class="error">⚠️ Не найдено ни одной новости. Вот что пришло:</div>';
        echo '<pre>' . print_r($data, true) . '</pre>';
    } else {
        echo '<p style="color:#666;margin-bottom:20px;">Всего новостей: <strong>' . count($items) . '</strong></p>';
        
        foreach ($items as $item) {
            $title = htmlspecialchars($item['title'] ?? $item['name'] ?? $item['header'] ?? 'Без заголовка');
            $text = htmlspecialchars($item['text'] ?? $item['description'] ?? $item['body'] ?? $item['content'] ?? 'Нет текста');
            $date = htmlspecialchars($item['date'] ?? $item['created_at'] ?? $item['timestamp'] ?? date('d.m.Y'));
            $category = htmlspecialchars($item['category'] ?? $item['type'] ?? '');
            
            echo '<div class="item">
                <h3>' . $title . '</h3>
                <p>' . nl2br($text) . '</p>
                <div class="date">📅 ' . $date . ' ' . ($category ? '<span class="badge">' . $category . '</span>' : '') . '</div>
            </div>';
        }
    }
}

echo '
    <div class="footer">
        🔄 Данные из Gist GitHub | ' . date('d.m.Y H:i') . '
    </div>
</div>
</body>
</html>';