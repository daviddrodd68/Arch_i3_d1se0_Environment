return {
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        -- Python LSP
        pyright = {
          settings = {
            python = {
              analysis = {
                autoSearchPaths = true,       -- Busca automáticamente paquetes instalados
                useLibraryCodeForTypes = true,
                diagnosticMode = "workspace", -- Analiza todo el proyecto
                autoImportCompletions = true, -- Sugiere imports automáticamente
              },
            },
          },
        },

        -- Bash LSP
        bashls = {
          filetypes = { "sh", "bash" },   -- Archivos que activan este LSP
          settings = {
            bashIde = {
              globPattern = "**/*",       -- Escanea todo el proyecto
              completionEnabled = true,   -- Autocompletado de comandos y variables
            },
          },
        },
      },
    },
  },
}
