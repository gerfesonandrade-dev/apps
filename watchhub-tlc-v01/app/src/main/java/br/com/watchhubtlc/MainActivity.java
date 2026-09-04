package br.com.watchhubtlc;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.ArrayAdapter;
import android.widget.TextView;
import android.widget.Toast;

import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String CHANNEL_ID = "watch_hub_tlc";
    private static final int REQ_NOTIFICATIONS = 1001;
    private static final int SAFE_BYTES = 60;
    private static final long GAP_MS = 1500L;
    private static final String PREFS = "watchhub_tlc_prefs";

    private EditText titleInput;
    private EditText messageInput;
    private Spinner prioritySpinner;
    private TextView byteCounter;
    private TextView preview;
    private TextView modeStatus;
    private TextView historyView;
    private NotificationManager notificationManager;
    private SharedPreferences prefs;
    private String currentMode;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        notificationManager = getSystemService(NotificationManager.class);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        currentMode = prefs.getString("mode", "TRABALHO");
        createChannel();
        requestNotificationPermissionIfNeeded();
        setContentView(buildUi());
        refreshPreview();
        refreshMode();
        refreshHistory();
        handleIncomingIntent(getIntent());
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
        subtitle.setText("V0.2 - modos, historico e integracao com o painel");
        subtitle.setTextSize(14);
        subtitle.setTextColor(Color.DKGRAY);
        subtitle.setPadding(0, 0, 0, dp(16));
        root.addView(subtitle);

        root.addView(cardText("PESSOAL + TLC\nO Chronos continua enviando WhatsApp, chamadas e outras notificacoes pessoais. Os modos abaixo controlam somente os alertas TLC."));

        root.addView(label("Modo atual"));
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

        root.addView(cardText("REGRAS DOS MODOS\nPESSOAL: so alta/critica\nTRABALHO: media, alta e critica\nPLANTAO: todos os alertas TLC\nSONO: somente critica"));

        root.addView(label("Titulo"));
        titleInput = new EditText(this);
        titleInput.setSingleLine(true);
        titleInput.setText("TLC WATCH");
        root.addView(titleInput, fullWidth());

        root.addView(label("Prioridade"));
        prioritySpinner = new Spinner(this);
        String[] priorities = new String[]{"BAIXA", "MEDIA", "ALTA", "CRITICA"};
        prioritySpinner.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, priorities));
        prioritySpinner.setSelection(2);
        root.addView(prioritySpinner, fullWidth());

        root.addView(label("Mensagem"));
        messageInput = new EditText(this);
        messageInput.setMinLines(4);
        messageInput.setGravity(Gravity.TOP);
        messageInput.setText("Socorro rota 55301. Produtor Jose Silva. Prioridade alta. Motivo leite fora. Confirmar atendimento.");
        root.addView(messageInput, fullWidth());

        byteCounter = new TextView(this);
        byteCounter.setTextSize(13);
        byteCounter.setTextColor(Color.DKGRAY);
        byteCounter.setPadding(0, dp(8), 0, dp(6));
        root.addView(byteCounter);

        Button previewBtn = button("PREVISUALIZAR BLOCOS");
        previewBtn.setOnClickListener(v -> refreshPreview());
        root.addView(previewBtn, fullWidth());

        preview = cardText("");
        preview.setTextIsSelectable(true);
        root.addView(preview);

        Button sendBtn = button("ENVIAR ALERTA TLC");
        sendBtn.setOnClickListener(v -> sendFromUi());
        root.addView(sendBtn, fullWidth());

        Button autoTest = button("SIMULAR ALERTA DO PAINEL");
        autoTest.setOnClickListener(v -> processAlert("TLC PAINEL", "Rota 55015 atrasada. Saida nao registrada. Verificar motorista e informar a operacao.", "ALTA", "painel-simulacao"));
        root.addView(autoTest, fullWidth());

        root.addView(cardText("INTEGRACAO V0.2\nO app ja aceita links do painel no formato:\nwatchhubtlc://alert?title=TLC%20ROTA&message=Rota%2055015%20atrasada&priority=ALTA\n\nNa proxima etapa, o mesmo mecanismo sera ligado ao envio em segundo plano pelo servidor."));

        root.addView(label("Historico TLC"));
        historyView = cardText("");
        historyView.setTextIsSelectable(true);
        root.addView(historyView);

        Button clearHistory = button("LIMPAR HISTORICO");
        clearHistory.setOnClickListener(v -> {
            prefs.edit().remove("history").apply();
            refreshHistory();
        });
        root.addView(clearHistory, fullWidth());

        root.addView(cardText("REGRAS DO RELOGIO\n- Sem emoji\n- Ate 60 bytes por bloco\n- Nao corta palavras\n- Blocos 1/2, 2/2...\n- Intervalo de 1,5 s"));

        ScrollView scroll = new ScrollView(this);
        scroll.addView(root);
        return scroll;
    }

    private Button modeButton(String mode) {
        Button b = button(mode);
        b.setOnClickListener(v -> {
            currentMode = mode;
            prefs.edit().putString("mode", mode).apply();
            refreshMode();
        });
        return b;
    }

    private void refreshMode() {
        if (modeStatus != null) modeStatus.setText("MODO: " + currentMode);
    }

    private void sendFromUi() {
        String priority = prioritySpinner.getSelectedItem().toString();
        processAlert(titleInput.getText().toString(), messageInput.getText().toString(), priority, "manual");
    }

    private void processAlert(String title, String body, String priority, String source) {
        title = sanitize(title);
        body = sanitize(body);
        priority = sanitize(priority).toUpperCase(Locale.ROOT);
        if (body.isEmpty()) {
            Toast.makeText(this, "Mensagem vazia.", Toast.LENGTH_SHORT).show();
            return;
        }
        if (!isAllowed(priority)) {
            addHistory("BLOQUEADO", title, body, priority, source);
            Toast.makeText(this, "Alerta bloqueado pelo modo " + currentMode + ".", Toast.LENGTH_LONG).show();
            return;
        }
        if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
            Toast.makeText(this, "Autorize notificacoes e tente novamente.", Toast.LENGTH_LONG).show();
            return;
        }
        List<String> chunks = splitForWatch(body, SAFE_BYTES);
        Handler handler = new Handler(Looper.getMainLooper());
        for (int i = 0; i < chunks.size(); i++) {
            final int idx = i;
            final String chunk = chunks.get(i);
            final String finalTitle = title.isEmpty() ? "TLC WATCH" : title;
            handler.postDelayed(() -> postNotification(finalTitle, chunk, idx), i * GAP_MS);
        }
        addHistory("ENVIADO", title, body, priority, source);
        Toast.makeText(this, "Enviado: " + chunks.size() + " bloco(s).", Toast.LENGTH_LONG).show();
    }

    private boolean isAllowed(String priority) {
        int p = priorityRank(priority);
        if ("PLANTAO".equals(currentMode)) return true;
        if ("TRABALHO".equals(currentMode)) return p >= 2;
        if ("PESSOAL".equals(currentMode)) return p >= 3;
        if ("SONO".equals(currentMode)) return p >= 4;
        return p >= 2;
    }

    private int priorityRank(String p) {
        if ("CRITICA".equals(p)) return 4;
        if ("ALTA".equals(p)) return 3;
        if ("MEDIA".equals(p)) return 2;
        return 1;
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return;
        Uri data = intent.getData();
        if (data == null || !"watchhubtlc".equalsIgnoreCase(data.getScheme())) return;
        if (!"alert".equalsIgnoreCase(data.getHost())) return;
        String title = data.getQueryParameter("title");
        String message = data.getQueryParameter("message");
        String priority = data.getQueryParameter("priority");
        processAlert(title == null ? "TLC WATCH" : title, message == null ? "" : message, priority == null ? "ALTA" : priority, "link-painel");
    }

    private void postNotification(String title, String text, int index) {
        Notification.Builder builder = new Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
                .setOnlyAlertOnce(false)
                .setWhen(System.currentTimeMillis());
        notificationManager.notify((int) (System.currentTimeMillis() % 100000) + index, builder.build());
    }

    private void addHistory(String status, String title, String body, String priority, String source) {
        String stamp = new SimpleDateFormat("dd/MM HH:mm:ss", new Locale("pt", "BR")).format(new Date());
        String line = stamp + " | " + status + " | " + priority + " | " + source + "\n" + sanitize(title) + " - " + sanitize(body);
        String old = prefs.getString("history", "");
        String combined = line + (old.isEmpty() ? "" : "\n\n" + old);
        if (combined.length() > 9000) combined = combined.substring(0, 9000);
        prefs.edit().putString("history", combined).apply();
        refreshHistory();
    }

    private void refreshHistory() {
        if (historyView == null) return;
        String h = prefs.getString("history", "");
        historyView.setText(h.isEmpty() ? "Nenhum alerta registrado." : h);
    }

    private void refreshPreview() {
        if (messageInput == null || byteCounter == null || preview == null) return;
        String clean = sanitize(messageInput.getText().toString().trim());
        int bytes = clean.getBytes(StandardCharsets.UTF_8).length;
        List<String> chunks = splitForWatch(clean, SAFE_BYTES);
        byteCounter.setText(bytes + " bytes | " + chunks.size() + " bloco(s) | limite seguro " + SAFE_BYTES);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            sb.append("BLOCO ").append(i + 1).append("/").append(chunks.size()).append(" (")
                    .append(chunks.get(i).getBytes(StandardCharsets.UTF_8).length).append(" bytes)\n")
                    .append(chunks.get(i));
            if (i < chunks.size() - 1) sb.append("\n\n");
        }
        preview.setText(sb.toString());
    }

    static List<String> splitForWatch(String text, int maxBytes) {
        String normalized = sanitize(text).replaceAll("\\s+", " ").trim();
        List<String> result = new ArrayList<>();
        if (normalized.isEmpty()) return result;
        if (normalized.getBytes(StandardCharsets.UTF_8).length <= maxBytes) {
            result.add(normalized);
            return result;
        }
        List<String> pieces = new ArrayList<>();
        String remaining = normalized;
        while (!remaining.isEmpty() && pieces.size() < 99) {
            String piece = takePiece(remaining, maxBytes - 6);
            if (piece.isEmpty()) break;
            pieces.add(piece);
            remaining = remaining.substring(piece.length()).trim();
        }
        for (int i = 0; i < pieces.size(); i++) result.add((i + 1) + "/" + pieces.size() + " " + pieces.get(i));
        return result;
    }

    private static String takePiece(String text, int maxBytes) {
        if (text.getBytes(StandardCharsets.UTF_8).length <= maxBytes) return text;
        StringBuilder out = new StringBuilder();
        int lastSpaceLength = -1;
        for (int offset = 0; offset < text.length();) {
            int cp = text.codePointAt(offset);
            String c = new String(Character.toChars(cp));
            if ((out.toString() + c).getBytes(StandardCharsets.UTF_8).length > maxBytes) break;
            out.append(c);
            if (Character.isWhitespace(cp)) lastSpaceLength = out.length() - 1;
            offset += Character.charCount(cp);
        }
        if (lastSpaceLength > 0) return out.substring(0, lastSpaceLength).trim();
        return out.toString().trim();
    }

    static String sanitize(String input) {
        if (input == null) return "";
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < input.length();) {
            int cp = input.codePointAt(i);
            i += Character.charCount(cp);
            boolean emoji = (cp >= 0x1F000 && cp <= 0x1FAFF) || (cp >= 0x2600 && cp <= 0x27BF) || (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0x1F1E6 && cp <= 0x1F1FF);
            if (emoji) continue;
            if (Character.isISOControl(cp) && cp != '\n' && cp != '\t') continue;
            out.appendCodePoint(cp);
        }
        return out.toString().replaceAll("\\s+", " ").trim();
    }

    private void createChannel() {
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "TLC Watch", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Alertas TLC enviados ao Chronos e ao relogio");
        channel.enableVibration(true);
        notificationManager.createNotificationChannel(channel);
    }

    private void requestNotificationPermissionIfNeeded() {
        if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
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
        b.setPadding(dp(8), dp(10), dp(8), dp(10));
        return b;
    }

    private LinearLayout horizontal() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.HORIZONTAL);
        return l;
    }

    private LinearLayout.LayoutParams halfWidth() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        lp.setMargins(dp(3), dp(3), dp(3), dp(3));
        return lp;
    }

    private LinearLayout.LayoutParams fullWidth() {
        return new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
