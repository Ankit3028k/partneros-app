import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { initializeApp } from '@partneros/app';
import { PartnerOS } from '@partneros/app';
import { PermissionPrompt } from '@partneros/app';
import { VoiceSessionController } from '@partneros/app';
import type { VoiceState } from '@partneros/app';
import type { ProcessResult } from '@partneros/app';
import { wakeWordService } from '@partneros/wakeword';
import { androidSpeechRecognizer } from '@partneros/stt';
import { eventBus } from '@partneros/core';

type Message = {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  source?: string;
};

function voiceStateLabel(state: VoiceState): string {
  switch (state) {
    case 'listening_for_wakeword':
      return 'Listening for "hey bro"...';
    case 'listening_for_command':
      return 'Listening...';
    case 'processing':
      return 'Thinking...';
    default:
      return 'Voice off';
  }
}

function App(): React.JSX.Element {
  const [partnerOS, setPartnerOS] = useState<PartnerOS | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', text: 'Namaste! Main PartnerOS hoon. Aapka personal AI assistant. Kya help chahiye?', role: 'assistant' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const voiceControllerRef = useRef<VoiceSessionController | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      await initializeApp('male');
      setPartnerOS(new PartnerOS());
    })();
  }, []);

  // Wire wakeword:triggered -> STT -> PartnerOS.process() once PartnerOS
  // is ready. Not auto-started -- user opts in via the mic toggle below,
  // since it needs RECORD_AUDIO + will be denied otherwise.
  useEffect(() => {
    if (!partnerOS) return;

    voiceControllerRef.current = new VoiceSessionController(wakeWordService, androidSpeechRecognizer, partnerOS);

    const unsubState = eventBus.on<{ state: VoiceState }>('voice:state', ({ state }) => {
      setVoiceState(state);
    });
    const unsubResponse = eventBus.on<ProcessResult>('voice:response', (result) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), text: result.message.content, role: 'assistant', source: result.source },
      ]);
    });

    return () => {
      unsubState();
      unsubResponse();
      void voiceControllerRef.current?.stop();
    };
  }, [partnerOS]);

  const toggleVoice = async () => {
    if (!voiceControllerRef.current) return;
    if (voiceEnabled) {
      await voiceControllerRef.current.stop();
      setVoiceEnabled(false);
      setVoiceState('idle');
    } else {
      await voiceControllerRef.current.start();
      setVoiceEnabled(true);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !partnerOS) return;

    setInput('');
    const userMsg: Message = { id: Date.now().toString(), text, role: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const result = await partnerOS.process(text);
    setLoading(false);

    if (result.ok) {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: result.value.message.content,
        role: 'assistant',
        source: result.value.source,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } else {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, kuch error aa gaya. Dobara try karein.',
        role: 'assistant',
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerText}>🤖 PartnerOS</Text>
              <Text style={styles.headerSub}>{voiceEnabled ? voiceStateLabel(voiceState) : 'On-Device AI'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.micButton, voiceEnabled && styles.micButtonActive]}
              onPress={toggleVoice}
            >
              <Text style={styles.micText}>{voiceEnabled ? '🎙️' : '🎙'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            renderItem={({ item }) => (
              <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.aiText]}>
                  {item.text}
                </Text>
                {item.source && item.role === 'assistant' && (
                  <Text style={styles.sourceTag}>⚡ {item.source}</Text>
                )}
              </View>
            )}
          />
          {loading && (
            <View style={styles.typing}>
              <Text style={styles.typingText}>PartnerOS soch raha hai...</Text>
            </View>
          )}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Kuch bhi poochho..."
              placeholderTextColor="#666"
              multiline
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading || !input.trim()}>
              <Text style={styles.sendText}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <PermissionPrompt />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  flex: { flex: 1 },
  header: { backgroundColor: '#16213e', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  micButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center' },
  micButtonActive: { backgroundColor: '#e94560' },
  micText: { fontSize: 18 },
  headerText: { color: '#e94560', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#aaa', fontSize: 12, marginTop: 2 },
  messageList: { flex: 1 },
  messageListContent: { padding: 16, paddingBottom: 8 },
  messageBubble: { maxWidth: '80%', marginBottom: 12, padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: '#e94560', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#16213e', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#fff' },
  aiText: { color: '#e0e0e0' },
  sourceTag: { color: '#888', fontSize: 10, marginTop: 6, textAlign: 'right' },
  typing: { paddingHorizontal: 16, paddingBottom: 4 },
  typingText: { color: '#888', fontSize: 12, fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#0f3460', backgroundColor: '#16213e' },
  input: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100 },
  sendButton: { marginLeft: 8, width: 44, height: 44, borderRadius: 22, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 18 },
});

export default App;
