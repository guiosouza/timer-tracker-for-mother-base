import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import ThemedTextInput from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  StyleSheet,
  TouchableOpacity,
  View,
  Clipboard
} from "react-native";

// Chave de armazenamento do JSON local
const STORAGE_KEY = "@tasks_data";

export default function EditarJsonScreen() {
  const [jsonData, setJsonData] = useState<Record<string, any>>({});
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editedTask, setEditedTask] = useState<any>(null);
  const [jsonString, setJsonString] = useState("");
  const [editMode, setEditMode] = useState<"visual" | "raw">("visual");

  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // Usando useMemo para recriar os estilos apenas quando o tema mudar
  const styles = useMemo(() => createStyles(colors), [colorScheme]);

  // Carregar dados do AsyncStorage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data);
        setJsonData(parsedData);
        setJsonString(JSON.stringify(parsedData, null, 2));
      }
    } catch (error) {
      Alert.alert("Erro", `Falha ao carregar dados: ${error}`);
    }
  };

  const saveData = async () => {
    try {
      let dataToSave = jsonData;

      if (editMode === "raw") {
        try {
          dataToSave = JSON.parse(jsonString);
        } catch (error) {
          Alert.alert("Erro", "JSON inválido. Verifique a formatação.");
          return;
        }
      } else if (selectedTask && editedTask) {
        dataToSave = { ...jsonData, [selectedTask]: editedTask };
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      Alert.alert("Sucesso", "Dados salvos com sucesso!");

      // Atualizar estado após salvar
      setJsonData(dataToSave);
      setJsonString(JSON.stringify(dataToSave, null, 2));

      if (selectedTask && editedTask) {
        setSelectedTask(null);
        setEditedTask(null);
      }
    } catch (error) {
      Alert.alert("Erro", `Falha ao salvar dados: ${error}`);
    }
  };

  const selectTask = (taskName: string) => {
    setSelectedTask(taskName);
    setEditedTask({ ...jsonData[taskName] });
  };

  const updateTaskField = (field: string, value: any) => {
    if (!editedTask) return;

    if (field === "timeline") {
      // Não permitir edição direta do timeline, que é um array
      return;
    }

    let parsedValue = value;
    if (field === "count") {
      parsedValue = parseInt(value) || 0;
    } else if (field === "timeWasUsed") {
      parsedValue = value === "true";
    }

    setEditedTask({ ...editedTask, [field]: parsedValue });
  };

  const renderBooleanField = (key: string, value: boolean) => {
    return (
      <View key={key} style={styles.fieldContainer}>
        <ThemedText>{key}: </ThemedText>
        <View style={styles.booleanSelector}>
          <TouchableOpacity
            style={[
              styles.booleanOption,
              value === true && styles.selectedOption,
            ]}
            onPress={() => updateTaskField(key, true)}
          >
            <ThemedText
              style={[
                styles.booleanText,
                { color: value === true ? "#fff" : colors.text },
              ]}
            >
              true
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.booleanOption,
              value === false && styles.selectedOption,
            ]}
            onPress={() => updateTaskField(key, false)}
          >
            <ThemedText
              style={[
                styles.booleanText,
                { color: value === false ? "#fff" : colors.text },
              ]}
            >
              false
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTaskEditor = () => {
    if (!selectedTask || !editedTask) return null;

    return (
      <ThemedView style={styles.editorContainer}>
        <ThemedText type="title" style={styles.editorTitle}>Editando: {selectedTask}</ThemedText>
        
        {/* Destacando o tempo total - agora editável */}
        {editedTask.totalTimeTracked && (
          <View style={styles.totalTimeContainer}>
            <ThemedText style={styles.totalTimeLabel}>TEMPO TOTAL</ThemedText>
            <ThemedTextInput
              style={styles.totalTimeInput}
              value={String(editedTask.totalTimeTracked)}
              onChangeText={(text) => updateTaskField('totalTimeTracked', text)}
            />
          </View>
        )}

        <View style={styles.fieldsContainer}>
          {Object.entries(editedTask).map(([key, value]) => {
            // Não mostrar totalTimeTracked novamente (já está destacado acima)
            if (key === "totalTimeTracked") return null;
            
            // Não mostrar timeline para edição direta
            if (key === "timeline") {
              return (
                <View key={key} style={styles.fieldContainer}>
                  <ThemedText style={styles.fieldLabel}>{key}: </ThemedText>
                  <View style={styles.timelineIndicator}>
                    <ThemedText style={styles.timelineText}>
                      {editedTask.timeline.length} registros
                    </ThemedText>
                  </View>
                </View>
              );
            }

            // Para campos booleanos, mostrar opções true/false
            if (typeof value === "boolean") {
              return renderBooleanField(key, value);
            }

            return (
              <View key={key} style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>{key}: </ThemedText>
                <ThemedTextInput
                  style={styles.input}
                  value={String(value)}
                  onChangeText={(text) => updateTaskField(key, text)}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={saveData}>
            <ThemedText style={styles.saveButtonText}>SALVAR ALTERAÇÕES</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => {
              setSelectedTask(null);
              setEditedTask(null);
            }}
          >
            <ThemedText style={styles.cancelButtonText}>CANCELAR</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  const copyJsonToClipboard = () => {
    Clipboard.setString(jsonString);
    Alert.alert("Sucesso", "JSON copiado para a área de transferência!");
  };

  const renderRawEditor = () => {
    return (
      <ThemedView style={styles.rawEditorContainer}>
        <ThemedText type="title">Editor JSON</ThemedText>
        <ThemedTextInput
          style={styles.jsonInput}
          multiline
          value={jsonString}
          onChangeText={setJsonString}
        />
        <View style={styles.jsonButtonsContainer}>
          <TouchableOpacity style={styles.copyButton} onPress={copyJsonToClipboard}>
            <ThemedText style={styles.copyButtonText}>COPIAR JSON</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveJsonButton} onPress={saveData}>
            <ThemedText style={styles.saveButtonText}>SALVAR JSON</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  const renderTaskList = () => {
    const taskNames = Object.keys(jsonData);

    if (taskNames.length === 0) {
      return <ThemedText>Nenhuma tarefa encontrada.</ThemedText>;
    }

    // Todos os cards usam a mesma cor verde

    return (
      <ThemedView style={styles.taskListContainer}>
        <ThemedText type="title" style={styles.sectionTitle}>Tarefas Disponíveis</ThemedText>
        <View style={styles.cardContainer}>
          {taskNames.map((taskName, index) => {
            // Cada card usa o estilo padrão verde definido no styles
            
            return (
              <TouchableOpacity
                key={taskName}
                style={styles.taskCard}
                onPress={() => selectTask(taskName)}
              >
                <View style={styles.taskCardHeader}>
                  <ThemedText style={styles.taskCardTitle}>{taskName}</ThemedText>
                </View>
                <View style={styles.taskCardBody}>
                  <ThemedText style={styles.taskTimeLabel}>Tempo total:</ThemedText>
                  <ThemedText style={styles.taskTimeValue}>
                    {jsonData[taskName].totalTimeTracked}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ThemedView>
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#E1F5FE", dark: "#01579B" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#03A9F4"
          name="pencil.and.outline"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title">Editor de JSON Local</ThemedText>

        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              editMode === "visual" && styles.selectedMode,
            ]}
            onPress={() => setEditMode("visual")}
          >
            <ThemedText
              style={[
                styles.modeText,
                { color: editMode === "visual" ? "#fff" : colors.text },
              ]}
            >
              Modo Visual
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              editMode === "raw" && styles.selectedMode,
            ]}
            onPress={() => setEditMode("raw")}
          >
            <ThemedText
              style={[
                styles.modeText,
                { color: editMode === "raw" ? "#fff" : colors.text },
              ]}
            >
              Modo JSON
            </ThemedText>
          </TouchableOpacity>
        </View>

        <Button title="Recarregar Dados" onPress={loadData} />

        {editMode === "visual" ? (
          <>{selectedTask ? renderTaskEditor() : renderTaskList()}</>
        ) : (
          renderRawEditor()
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

// Criando estilos com base no tema
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      padding: 16,
    },
    headerImage: {
      bottom: -90,
      left: -35,
      position: "absolute",
    },
    modeSelector: {
      flexDirection: "row",
      marginVertical: 16,
    },
    modeButton: {
      flex: 1,
      padding: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedMode: {
      backgroundColor: "#03A9F4",
    },
    modeText: {
      fontWeight: "bold",
      color: colors.text,
    },
    taskListContainer: {
      marginTop: 16,
    },
    sectionTitle: {
      marginBottom: 16,
      textAlign: 'center',
      color: '#00FF00',
      fontFamily: 'monospace',
      textTransform: 'uppercase',
      letterSpacing: 2,
      textShadowColor: '#00FF00',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 4,
      borderBottomWidth: 1,
      borderBottomColor: '#00FF00',
      paddingBottom: 8,
    },
    cardContainer: {
      flexDirection: 'column',
    },
    taskCard: {
      width: '100%',
      marginBottom: 16,
      borderRadius: 0,
      borderWidth: 2,
      borderColor: '#00FF00',
      backgroundColor: '#000000',
      overflow: 'hidden',
      elevation: 3,
      shadowColor: '#00FF00',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      position: 'relative',
    },
    taskCardHeader: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#00FF00',
      backgroundColor: '#000000',
      position: 'relative',
    },
    taskCardTitle: {
      fontWeight: 'bold',
      color: '#00FF00',
      textAlign: 'center',
      fontFamily: 'monospace',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    taskCardBody: {
      padding: 12,
      alignItems: 'center',
      backgroundColor: '#0A0A0A',
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderColor: '#00FF00',
    },
    taskTimeLabel: {
      fontSize: 10,
      marginBottom: 4,
      opacity: 0.9,
      color: '#00FF00',
      fontFamily: 'monospace',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    taskTimeValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#00FF00',
      fontFamily: 'monospace',
    },
    editorContainer: {
      marginTop: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: '#00FF00',
      borderRadius: 0,
      backgroundColor: '#141414',
      shadowColor: '#00FF00',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
      position: 'relative',
    },
    fieldContainer: {
      marginVertical: 12,
      position: 'relative',
    },
    fieldLabel: {
      fontWeight: 'bold',
      marginBottom: 4,
      color: '#00FF00',
      fontFamily: 'monospace',
      textTransform: 'uppercase',
      fontSize: 10,
      letterSpacing: 1,
    },
    input: {
      borderWidth: 1,
      borderRadius: 0,
      padding: 10,
      marginTop: 6,
      borderColor: '#00FF00',
      color: '#00FF00',
      backgroundColor: '#0A0A0A',
      fontSize: 14,
      fontFamily: 'monospace',
    },
    buttonContainer: {
      flexDirection: "column",
      alignItems: "center",
      marginTop: 20,
      marginBottom: 10,
    },
    editorTitle: {
      textAlign: 'center',
      marginBottom: 16,
    },
    totalTimeContainer: {
      backgroundColor: '#000000',
      padding: 12,
      borderRadius: 0,
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: '#00FF00',
      position: 'relative',
    },
    totalTimeLabel: {
      color: '#00FF00',
      fontSize: 12,
      fontFamily: 'monospace',
      textTransform: 'uppercase',
      letterSpacing: 1,
      opacity: 0.9,
    },
    totalTimeValue: {
      color: '#00FF00',
      fontSize: 28,
      fontFamily: 'monospace',
      marginTop: 4,
      fontWeight: 'bold',
    },
    totalTimeInput: {
      backgroundColor: '#000000',
      color: '#00FF00',
      fontSize: 28,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      borderColor: '#00FF00',
      borderWidth: 1,
      padding: 8,
      textAlign: 'center',
      width: '90%',
      maxWidth: 200,
      alignSelf: 'center',
    },
    fieldsContainer: {
      marginTop: 10,
    },
    // fieldLabel já definido anteriormente
    timelineIndicator: {
      backgroundColor: '#0A0A0A',
      padding: 8,
      borderRadius: 0,
      borderWidth: 1,
      borderColor: '#00FF00',
      marginTop: 4,
    },
    timelineText: {
      color: '#00FF00',
      fontFamily: 'monospace',
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontSize: 12,
    },
    saveButton: {
      backgroundColor: '#000000',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 0,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 200,
      width: '80%',
      marginBottom: 12,
      borderWidth: 2,
      borderColor: '#00FF00',
    },
    saveButtonText: {
      color: '#00FF00',
      fontFamily: 'monospace',
      fontSize: 14,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    cancelButton: {
      backgroundColor: '#000000',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 0,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 200,
      width: '80%',
      borderWidth: 2,
      borderColor: '#FF3D00',
    },
    cancelButtonText: {
      color: '#FF3D00',
      fontFamily: 'monospace',
      fontSize: 14,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    booleanSelector: {
      flexDirection: "row",
      marginTop: 8,
    },
    booleanOption: {
      padding: 10,
      marginRight: 10,
      borderWidth: 1,
      borderColor: '#00FF00',
      borderRadius: 0,
      minWidth: 80,
      alignItems: 'center',
      backgroundColor: '#000000',
    },
    selectedOption: {
      backgroundColor: "#0A0A0A",
      borderColor: "#00FF00",
      borderWidth: 2,
    },
    booleanText: {
      fontFamily: "monospace",
      color: '#00FF00',
      textTransform: 'uppercase',
      fontSize: 12,
      letterSpacing: 1,
    },
    rawEditorContainer: {
      marginTop: 16,
    },
    jsonInput: {
      borderWidth: 1,
      borderRadius: 4,
      padding: 12,
      marginVertical: 16,
      height: 300,
      fontFamily: "monospace",
      borderColor: '#4CAF50',
      color: colors.text,
      backgroundColor: colors.backgroundInput,
      fontSize: 14,
    },
    jsonButtonsContainer: {
      flexDirection: "column",
      marginTop: 10,
    },
    copyButton: {
      backgroundColor: "#000000",
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 0,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      borderWidth: 2,
      borderColor: "#03A9F4",
    },
    saveJsonButton: {
      backgroundColor: "#000000",
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 0,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#00FF00",
    },
    copyButtonText: {
      color: "#03A9F4",
      fontFamily: "monospace",
      fontSize: 14,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
  });