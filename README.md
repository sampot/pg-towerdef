# pg-towerdef

瀏覽器**迷你塔防**：單一路徑、箭塔／炮塔／冰塔、十二波防守。純前端；**mobile-first**。

也可當作 [Playgrounds（遊樂場）](https://play.samkuo.me/) 的 **SAM**（`index.html` 入口）。

## 一鍵開 SAM 小

**[一鍵開 SAM 小](https://play.samkuo.me/?open=sampot%2Fpg-towerdef&name=%E8%BF%B7%E4%BD%A0%E5%A1%94%E9%98%B2)**

```
https://play.samkuo.me/?open=sampot/pg-towerdef&name=迷你塔防
```

同源會重用本機已匯入的沙盒；要強制新建可加 `&fresh=1`。

## 試玩（本機）

```bash
npx --yes serve .
# 或
python3 -m http.server 8080
```

點一下頁面後音效才會出聲。

## 操作

| 操作 | 說明 |
| --- | --- |
| 選塔種 | 箭塔／炮塔／冰塔 |
| 點空地 | 建造（扣金幣） |
| 點已建塔 | 選取後可升級或賣掉 |
| **下一波** | 放出下一波敵人 |

## License

MIT
