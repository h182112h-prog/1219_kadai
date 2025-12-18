    const OPENAI_API_KEY = "";

    const fileInput = document.getElementById("csvFile");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const statusEl = document.getElementById("status");
    const resultEl = document.getElementById("result");

    analyzeBtn.addEventListener("click", () => {
      const file = fileInput.files[0];

      if (!file) {
        alert("先にCSVファイルを選んでください");
        return;
      }

      statusEl.textContent = "CSVを読み込み中...";
      resultEl.textContent = "";

      const reader = new FileReader();

      reader.onload = async (e) => {
        const csvText = e.target.result;

        // 最初の50行だけ送る
        const maxLines = 50;
        const lines = csvText.split(/\r?\n/).slice(0, maxLines);
        const truncatedCsv = lines.join("\n");

        statusEl.textContent = "OpenAIに問い合わせ中...";

        try {
          const explanation = await getCsvExplanation(truncatedCsv);
          statusEl.textContent = "完了";
          resultEl.textContent = explanation;
        } catch (err) {
          console.error(err);
          statusEl.textContent = "エラーが発生しました";
          resultEl.textContent = "エラー: " + err.message;
        }
      };

      // UTF-8 前提。必要なら encoding を変える
      reader.readAsText(file, "utf-8");
    });

    /**
     * ② OpenAI API に CSVテキストを投げて、日本語の説明を返す関数
     */
    async function getCsvExplanation(csvText) {
      const apiUrl = "https://api.openai.com/v1/chat/completions";

      const systemPrompt = `
あなたは優秀な人事データアナリストです。
これから人事に関するCSVファイルの内容の一部が渡されます。
列の意味や、どのようなデータが入っていそうかを、
・専門家として、
・箇条書き中心で
・日本語で
全体感がわかるようにざっくり説明してください。
`;

      const userPrompt = `
以下はCSVファイルの内容（一部）です。
このCSVがどのようなデータか、簡単に説明してください。

--- CSVここから ---
${csvText}
--- CSVここまで ---
`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini", // または "gpt-4o-mini" など、手元のプランに合わせて変更
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("HTTPエラー: " + response.status + " / " + errorText);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content;

      if (!message) {
        throw new Error("APIレスポンス形式が想定外です: " + JSON.stringify(data));
      }

      return message.trim();
    }