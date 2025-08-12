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
  View
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
        <ThemedText type="title">Editando: {selectedTask}</ThemedText>

        {Object.entries(editedTask).map(([key, value]) => {
          // Não mostrar timeline para edição direta
          if (key === "timeline") {
            return (
              <View key={key} style={styles.fieldContainer}>
                <ThemedText>{key}: </ThemedText>
                <ThemedText>
                  [{editedTask.timeline.length} registros]
                </ThemedText>
              </View>
            );
          }

          // Para campos booleanos, mostrar opções true/false
          if (typeof value === "boolean") {
            return renderBooleanField(key, value); // <-- Troque por abaixo
          }

          return (
            <View key={key} style={styles.fieldContainer}>
              <ThemedText>{key}: </ThemedText>
              <ThemedTextInput
                style={styles.input}
                value={String(value)}
                onChangeText={(text) => updateTaskField(key, text)}
              />
            </View>
          );
        })}

        <View style={styles.buttonContainer}>
          <Button title="Salvar Alterações" onPress={saveData} />
          <Button
            title="Cancelar"
            onPress={() => {
              setSelectedTask(null);
              setEditedTask(null);
            }}
            color="red"
          />
        </View>
      </ThemedView>
    );
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
        <Button title="Salvar JSON" onPress={saveData} />
      </ThemedView>
    );
  };

  const renderTaskList = () => {
    const taskNames = Object.keys(jsonData);

    if (taskNames.length === 0) {
      return <ThemedText>Nenhuma tarefa encontrada.</ThemedText>;
    }

    return (
      <ThemedView style={styles.taskListContainer}>
        <ThemedText type="title">Tarefas Disponíveis</ThemedText>
        {taskNames.map((taskName) => (
          <TouchableOpacity
            key={taskName}
            style={styles.taskItem}
            onPress={() => selectTask(taskName)}
          >
            <ThemedText>{taskName}</ThemedText>
            <ThemedText style={styles.taskDetails}>
              Tempo total: {jsonData[taskName].totalTimeTracked}
            </ThemedText>
          </TouchableOpacity>
        ))}
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
    taskItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    taskDetails: {
      fontSize: 12,
      marginTop: 4,
    },
    editorContainer: {
      marginTop: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    fieldContainer: {
      marginVertical: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 4,
      padding: 8,
      marginTop: 4,
      borderColor: colors.border,
      color: colors.text,
      backgroundColor: colors.backgroundInput,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 16,
    },
    booleanSelector: {
      flexDirection: "row",
      marginTop: 4,
    },
    booleanOption: {
      padding: 8,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
    },
    selectedOption: {
      backgroundColor: "#03A9F4",
      borderColor: "#03A9F4",
    },
    booleanText: {
      fontWeight: "bold",
      color: colors.text,
    },
    rawEditorContainer: {
      marginTop: 16,
    },
    jsonInput: {
      borderWidth: 1,
      borderRadius: 4,
      padding: 8,
      marginVertical: 16,
      height: 300,
      fontFamily: "monospace",
      borderColor: colors.border,
      color: colors.text,
      backgroundColor: colors.background,
    },
  });