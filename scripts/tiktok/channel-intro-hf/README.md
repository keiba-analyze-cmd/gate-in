# きらメモ 推し登録機能 実装ガイド

## 📁 ファイル構成

```
lib/
├── models/
│   └── preset_models.dart       # データモデル（Genre, Group, Member等）
├── repositories/
│   ├── preset_repository.dart   # 抽象リポジトリ（インターフェース）
│   └── local_preset_repository.dart  # ローカルJSON実装
├── services/
│   └── preset_service.dart      # Providerサービス
├── theme/
│   └── app_theme.dart           # デザイントークン
└── screens/
    ├── oshi_registration_screen.dart  # メイン画面
    ├── steps/
    │   ├── step1_genre_select.dart    # ジャンル選択
    │   ├── step2_group_select.dart    # グループ選択
    │   ├── step3_oshi_type.dart       # 推し方選択
    │   ├── step4_member_select.dart   # メンバー選択
    │   ├── step5_mode_select.dart     # モード選択
    │   └── step6_confirm.dart         # 確認画面
    └── widgets/
        └── common_widgets.dart         # 共通ウィジェット

assets/
└── data/
    └── oshi_presets.json        # プリセットデータ（v1.0.1）
```

## 🚀 導入手順

### 1. 依存関係を追加（pubspec.yaml）

```yaml
dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.1

flutter:
  assets:
    - assets/data/oshi_presets.json
```

### 2. Providerを設定（main.dart）

```dart
import 'package:provider/provider.dart';
import 'services/preset_service.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => PresetService()),
        ChangeNotifierProvider(create: (_) => OshiRegistrationService()),
      ],
      child: const MyApp(),
    ),
  );
}
```

### 3. 画面を呼び出す

```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => const OshiRegistrationScreen(),
  ),
);
```

## 🔄 将来のSupabase移行

### 現在の設計（ローカルJSON）
```
App → PresetService → LocalPresetRepository → assets/oshi_presets.json
```

### Supabase移行後
```
App → PresetService → SupabasePresetRepository → Supabase DB
                    ↘ LocalPresetRepository (fallback/cache)
```

### 移行手順

1. `SupabasePresetRepository` を作成（`PresetRepository`を実装）
2. Supabaseにテーブル作成（genres, groups, members）
3. JSONデータをSupabaseにインポート
4. `PresetService` のリポジトリ注入を切り替え

```dart
// 現在
PresetService({PresetRepository? repository}) 
    : _repository = repository ?? LocalPresetRepository();

// 移行後
PresetService({PresetRepository? repository}) 
    : _repository = repository ?? SupabasePresetRepository(
        fallback: LocalPresetRepository(),
      );
```

## 📊 データ構造

### プリセットJSON構造
```json
{
  "version": "1.0.1",
  "lastUpdated": "2025-03-02",
  "genres": [
    {
      "id": "kpop_male",
      "name": "K-POP（男性）",
      "emoji": "🇰🇷",
      "groups": [
        {
          "id": "bts",
          "name": "BTS",
          "company": "BIGHIT",
          "defaultColor": "#6A3CBC",
          "members": [
            { "name": "RM", "color": "#6A3CBC" },
            ...
          ]
        }
      ]
    }
  ]
}
```

## 🎨 デザイントークン

| トークン | 値 | 用途 |
|---------|-----|------|
| `AppColors.primary` | `#C4648B` | ブランドピンク |
| `AppColors.purple` | `#7B6CB5` | 箱推し・ライブモード |
| `AppColors.background` | `#F7F4F0` | 背景（クリーム） |
| `AppColors.surface` | `#FFFFFF` | カード背景 |

## ✅ 収録ジャンル（10カテゴリ）

1. K-POP（男性）- 12グループ
2. K-POP（女性）- 12グループ
3. STARTO（旧ジャニーズ）- 10グループ
4. 坂道グループ - 3グループ
5. LDH - 6グループ
6. 2.5次元俳優 - 4グループ
7. アイドル（中堅・地下）- 9グループ
8. VTuber - 2グループ
9. バンド - 6グループ
10. 声優 - 2グループ

**合計: 66グループ、400+メンバー**

## 📝 更新履歴

### v1.0.1 (2025-03-02)
- Kis-My-Ft2から北山宏光を削除（2023年8月脱退）
- A.B.C-Zから河合郁人を削除（2023年12月脱退）
- NCT 127からテイルを削除（2024年8月脱退）、ジョニーを追加
- RIIZEからスンハンを削除（2024年10月脱退）
- timelesz 8人体制に更新
- 超ときめき♡宣伝部メンバー修正
- SWEET STEADYメンバー確定
