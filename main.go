package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Src          string `json:"src"`
	Ignore       string `json:"ignore"`
	Output       string `json:"output"`
	FirstComment string `json:"first_comment"`
	LastComment  string `json:"last_comment"`
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "config" {
		createConfig()
		return
	}
	generateContext()
}

func createConfig() {
	config := Config{
		Src:          "./src",
		Ignore:       "*.log, temp/, node_modules/, .git/",
		Output:       "./mkctx",
		FirstComment: "/* Project Context */",
		LastComment:  "/* End of Context */",
	}

	configJSON, _ := json.MarshalIndent(config, "", "  ")

	// Create mkctx directory if it doesn't exist
	_ = os.MkdirAll("mkctx", 0755)

	// Write configuration file
	_ = os.WriteFile("mkctx.config.json", configJSON, 0644)

	// Update .gitignore
	updateGitignore()

	fmt.Println("✅ Configuration created:")
	fmt.Println("   - mkctx.config.json")
	fmt.Println("   - mkctx/ folder")
	fmt.Println("   - Entry in .gitignore")
}

func updateGitignore() {
	gitignorePath := ".gitignore"
	content, err := os.ReadFile(gitignorePath)
	gitignoreExists := err == nil

	var newContent string
	if gitignoreExists {
		newContent = string(content)
		if !strings.Contains(newContent, "mkctx/") {
			newContent += "\n# mkctx - generated context\nmkctx/\n"
		}
	} else {
		newContent = "# mkctx - generated context\nmkctx/\n"
	}

	_ = os.WriteFile(gitignorePath, []byte(newContent), 0644)
}

func generateContext() {
	config := loadConfig()
	files := getFiles(config)
	content := buildContent(files, config)

	outputPath := config.Output
	if outputPath == "" {
		outputPath = "."
	}

	// Ensure output directory exists
	_ = os.MkdirAll(outputPath, 0755)

	outputFile := filepath.Join(outputPath, "context.md")
	err := os.WriteFile(outputFile, []byte(content), 0644)
	if err != nil {
		fmt.Printf("❌ Error creating file: %v\n", err)
		return
	}
	fmt.Printf("✅ Context generated at: %s\n", outputFile)
}

func loadConfig() Config {
	var config Config
	file, err := os.ReadFile("mkctx.config.json")
	if err != nil {
		return getDefaultConfig()
	}
	json.Unmarshal(file, &config)

	// Validate and complete configuration
	if config.Src == "" {
		config.Src = "."
	}
	if config.Output == "" {
		config.Output = "."
	}

	return config
}

func getDefaultConfig() Config {
	return Config{
		Src:          ".",
		Output:       ".",
		FirstComment: "/* Project Context */",
		LastComment:  "/* End of Context */",
	}
}

func getFiles(config Config) []string {
	var files []string

	srcPath := config.Src
	if srcPath == "" {
		srcPath = "."
	}

	filepath.Walk(srcPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || shouldIgnore(path, config) || info.IsDir() {
			return nil
		}
		files = append(files, path)
		return nil
	})
	return files
}

func shouldIgnore(path string, config Config) bool {
	// Ignore system files
	if strings.Contains(path, ".git") ||
		strings.Contains(path, ".DS_Store") ||
		strings.Contains(path, "Thumbs.db") {
		return true
	}

	// Ignore based on configuration
	if config.Ignore != "" {
		ignorePatterns := strings.Split(config.Ignore, ",")
		for _, pattern := range ignorePatterns {
			pattern = strings.TrimSpace(pattern)
			if pattern == "" {
				continue
			}

			// Simple pattern with wildcard
			if strings.Contains(pattern, "*") {
				if matched, _ := filepath.Match(pattern, filepath.Base(path)); matched {
					return true
				}
			}

			// Entire directory
			if strings.HasSuffix(pattern, "/") {
				dir := strings.TrimSuffix(pattern, "/")
				if strings.Contains(path, dir) {
					return true
				}
			}

			// Exact match
			if strings.Contains(path, pattern) {
				return true
			}
		}
	}

	return false
}

func buildContent(files []string, config Config) string {
	var content strings.Builder

	if config.FirstComment != "" {
		content.WriteString(config.FirstComment + "\n\n")
	}

	for _, file := range files {
		fileContent, err := os.ReadFile(file)
		if err != nil {
			continue
		}

		ext := filepath.Ext(file)
		lang := "text"
		if ext != "" {
			lang = ext[1:] // Remove the dot
		}

		content.WriteString("```" + lang + "\n")
		content.WriteString("// " + file + "\n")
		content.WriteString(string(fileContent))
		content.WriteString("\n```\n\n")
	}

	if config.LastComment != "" {
		content.WriteString(config.LastComment)
	}
	return content.String()
}
