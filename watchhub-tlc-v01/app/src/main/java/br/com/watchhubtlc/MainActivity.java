package br.com.watchhubtlc;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import java.nio.charset.StandardCharsets;
import java.util.List;

public class MainActivity extends Activity {
    private static final int REQ_NOTIFICATIONS = 1001;

    private TextView modeStatus;
    private TextView listenerStatus;
    private TextView preview;
    private TextView byteCounter;
    private TextView historyView;
    private EditText titleInput;
    private EditText messageInput;
    private EditText keywordsInput;
    private Spinner prioritySpinner;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        AlertEngine.ensureChannel(this);
        requestNotificationPermissionIfNeeded();
        setContentView(buildUi());
        refreshAll();
        handleIncomingIntent(getIntent());
    }

    @Override
    protected void onResume() {
        super.onResume();
        refreshAll();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    private View buildUi() {
        int pad = dp(18);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);
        root.setBackgroundColor(Color.rgb(244, 246, 248));

        TextView header = new TextView(this);
        header.setText("Watch Hub + TLC");
        header.setTextSize(26);
        header.setTextColor(Color.rgb(12, 44, 70));
        root.addView(header);

        TextView subtitle = new TextView(this);
        subtitle.setText("V0.3 - ponte automatica de notificacoes do Android");
        subtitle.setTextSize(14);
        subtitle.setTextColor(Color.DKGRAY);
        subtitle.setPadding(0, 0, 0, dp(16));
        root.addView(subtitle);

        root.addView(cardText("PESSOAL + TLC\nO Chronos continua cuidando de WhatsApp, chamadas e demais notificacoes pessoais. O Watch Hub identifica somente avisos TLC, reduz para o formato do relogio e repassa ao Chronos."));

        root.addView(label("Ponte automatica"));
        listenerStatus = cardText("");
        root.addView(listenerStatus);

        Button listenerBtn = button("ATIVAR ACESSO AS NOTIFICACOES");
        listenerBtn.setOnClickListener(v -> {
            try {
                startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
            } catch (Exception e) {
                Toast.makeText(this, "Abra Configuracoes > Notificacoes > Acesso a notificacoes.", Toast.LENGTH_LONG).show();
            }
        });
        root.addView(listenerBtn, fullWidth());

        root.addView(cardText("COMO FUNCIONA\nPainel/navegador recebe o aviso -> Android mostra a notificacao -> Watch Hub identifica TLC -> divide em ate 60 bytes -> Chronos -> X5 Pro Max. O painel nao precisa estar aberto na tela."));

        root.addView(label("Modo TLC"));
        modeStatus = cardText("");
        root.addView(modeStatus);

        LinearLayout modes1 = horizontal();
        modes1.addView(modeButton("PESSOAL"), halfWidth());
        modes1.addView(modeButton("TRABALHO"), halfWidth());
        root.addView(modes1, fullWidth());

        LinearLayout modes2 = horizontal();
        modes2.addView(modeButton("PLANTAO"), halfWidth());
        modes2.addView(modeButton("SONO"), halfWidth());
        root.addView(modes2, fullWidth());

        root.addView(cardText("PESSOAL: alta/critica | TRABALHO: media/alta/critica | PLANTAO: todos | SONO: somente critica"));

        root.addView(label("Palavras que identificam aviso TLC"));
        keywordsInput = new EditText(this);
        keywordsInput.setMinLines(3);
        keywordsInput.setGravity(Gravity.TOP);
        root.addView(keywordsInput, fullWidth());

        Button saveKeywords = button("SALVAR FILTRO AUTOMATICO");
        saveKeywords.setOnClickListener(v -> {
            AlertEngine.setKeywords(this, keywordsInput.getText().toString());
            keywordsInput.setText(AlertEngine.getKeywords(this));
            Toast.makeText(this, "Filtro TLC salvo.", Toast.LENGTH_SHORT).show();
        });
        root.addView(saveKeywords, fullWidth());

        root.addView(label("Teste manual"));
        titleInput = new EditText(this);
        titleInput.setSingleLine(true);
        titleInput.setText("TLC WATCH");
        root.addView(titleInput, fullWidth());

        prioritySpinner = new Spinner(this);
        String[] priorities = new String[]{"BAIXA", "MEDIA", "ALTA", "CRITICA"};
        prioritySpinner.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, priorities));
        prioritySpinner.setSelection(2);
        root.addView(prioritySpinner, fullWidth());

        messageInput = new EditText(this);
        messageInput.setMinLines(4);
        messageInput.setGravity(Gravity.TOP);
        messageInput.setText("Rota 55015 atrasada. Saida nao registrada. Verificar motorista e informar a operacao.");
        root.addView(messageInput, fullWidth());

        byteCounter = new TextView(this);
        byteCounter.setTextColor(Color.DKGRAY);
        byteCounter.setPadding(0, dp(8), 0, dp(4));
        root.addView(byteCounter);

        Button previewBtn = button("PREVISUALIZAR BLOCOS");
        previewBtn.setOnClickListener(v -> refreshPreview());
        root.addView(previewBtn, fullWidth());

        preview = cardText("");
        preview.setTextIsSelectable(true);
        root.addView(preview);

        Button sendBtn = button("ENVIAR TESTE TLC");
        sendBtn.setOnClickListener(v -> sendManual());
        root.addView(sendBtn, fullWidth());

        Button simulateExternal = button("SIMULAR AVISO RECEBIDO DO PAINEL");
        simulateExternal.setOnClickListener(v -> {
            int result = AlertEngine.send(this,
                    "TLC PAINEL",
                    "Socorro rota 55301. Produtor Jose Silva. Leite fora. Confirmar atendimento com prioridade critica.",
                    "CRITICA",
                    "simulacao-painel-v0.3");
            showSendResult(result);
            refreshHistory();
        });
        root.addView(simulateExternal, fullWidth());

        root.addView(label("Historico TLC"));
        historyView = cardText("");
        historyView.setTextIsSelectable(true);
        root.addView(historyView);

        Button clearHistory = button("LIMPAR HISTORICO");
        clearHistory.setOnClickListener(v -> {
            AlertEngine.clearHistory(this);
            refreshHistory();
        });
        root.addView(clearHistory, fullWidth());

        root.addView(cardText("REGRAS DO RELOGIO\n- Sem emoji\n- Ate 60 bytes por bloco\n- Nao corta palavras\n- Blocos 1/2, 2/2...\n- Intervalo de 1,5 s\n- Notificacoes pessoais continuam independentes pelo Chronos"));

        ScrollView scroll = new ScrollView(this);
        scroll.addView(root);
        return scroll;
    }

    private void sendManual() {
        String priority = prioritySpinner.getSelectedItem().toString();
        int result = AlertEngine.send(this,
                titleInput.getText().toString(),
                messageInput.getText().toString(),
                priority,
                "manual-v0.3");
        showSendResult(result);
        refreshHistory();
    }

    private void showSendResult(int result) {
        if (result > 0) Toast.makeText(this, "Enviado: " + result + " bloco(s).", Toast.LENGTH_LONG).show();
        else if (result == -1) Toast.makeText(this, "Bloqueado pelo modo " + AlertEngine.currentMode(this) + ".", Toast.LENGTH_LONG).show();
        else if (result == -2) Toast.makeText(this, "Autorize as notificacoes do Watch Hub.", Toast.LENGTH_LONG).show();
        else Toast.makeText(this, "Nada para enviar.", Toast.LENGTH_SHORT).show();
    }

    private Button modeButton(String mode) {
        Button b = button(mode);
        b.setOnClickListener(v -> {
            AlertEngine.setMode(this, mode);
            refreshMode();
        });
        return b;
    }

    private void refreshAll() {
        refreshMode();
        refreshListenerStatus();
        refreshHistory();
        if (keywordsInput != null) keywordsInput.setText(AlertEngine.getKeywords(this));
        refreshPreview();
    }

    private void refreshMode() {
        if (modeStatus != null) modeStatus.setText("MODO: " + AlertEngine.currentMode(this));
    }

    private void refreshListenerStatus() {
        if (listenerStatus == null) return;
        boolean enabled = isNotificationListenerEnabled();
        listenerStatus.setText(enabled
                ? "ATIVO - o app pode identificar alertas TLC mesmo em segundo plano."
                : "DESATIVADO - toque no botao abaixo e habilite Watch Hub TLC.");
        listenerStatus.setTextColor(enabled ? Color.rgb(20, 110, 55) : Color.rgb(170, 45, 35));
    }

    private boolean isNotificationListenerEnabled() {
        String enabled = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        return enabled != null && enabled.contains(getPackageName());
    }

    private void refreshHistory() {
        if (historyView == null) return;
        String history = AlertEngine.getHistory(this);
        historyView.setText(history.isEmpty() ? "Nenhum alerta registrado." : history);
    }

    private void refreshPreview() {
        if (messageInput == null || preview == null || byteCounter == null) return;
        String clean = AlertEngine.sanitize(messageInput.getText().toString());
        List<String> chunks = AlertEngine.splitForWatch(clean, AlertEngine.SAFE_BYTES);
        int bytes = clean.getBytes(StandardCharsets.UTF_8).length;
        byteCounter.setText(bytes + " bytes | " + chunks.size() + " bloco(s) | limite seguro 60 bytes");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            String chunk = chunks.get(i);
            sb.append("BLOCO ").append(i + 1).append("/").append(chunks.size())
                    .append(" (").append(chunk.getBytes(StandardCharsets.UTF_8).length).append(" bytes)\n")
                    .append(chunk);
            if (i < chunks.size() - 1) sb.append("\n\n");
        }
        preview.setText(sb.length() == 0 ? "Sem conteudo." : sb.toString());
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return;
        Uri data = intent.getData();
        if (data == null || !"watchhubtlc".equalsIgnoreCase(data.getScheme()) || !"alert".equalsIgnoreCase(data.getHost())) return;
        String title = data.getQueryParameter("title");
        String message = data.getQueryParameter("message");
        String priority = data.getQueryParameter("priority");
        int result = AlertEngine.send(this,
                title == null ? "TLC WATCH" : title,
                message == null ? "" : message,
                priority == null ? "ALTA" : priority,
                "link-painel");
        showSendResult(result);
        refreshHistory();
    }

    private void requestNotificationPermissionIfNeeded() {
        if (android.os.Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
        }
    }

    private TextView label(String text) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextSize(14);
        tv.setTextColor(Color.rgb(12, 44, 70));
        tv.setPadding(0, dp(14), 0, dp(4));
        return tv;
    }

    private TextView cardText(String text) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextSize(14);
        tv.setTextColor(Color.rgb(32, 39, 45));
        tv.setPadding(dp(14), dp(12), dp(14), dp(12));
        tv.setBackgroundColor(Color.WHITE);
        LinearLayout.LayoutParams lp = fullWidth();
        lp.setMargins(0, dp(6), 0, dp(10));
        tv.setLayoutParams(lp);
        return tv;
    }

    private Button button(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextSize(14);
        b.setAllCaps(false);
        b.setPadding(dp(10), dp(10), dp(10), dp(10));
        return b;
    }

    private LinearLayout horizontal() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        return row;
    }

    private LinearLayout.LayoutParams fullWidth() {
        return new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    }

    private LinearLayout.LayoutParams halfWidth() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        lp.setMargins(dp(3), 0, dp(3), 0);
        return lp;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
