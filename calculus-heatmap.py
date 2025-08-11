import pandas as pd

# Data for syllabus heat map
topics = [
    ("Functions, Limits & Continuity", "Domain/co-domain/range", "High"),
    ("Functions, Limits & Continuity", "One-one & onto + inverse functions", "High"),
    ("Functions, Limits & Continuity", "Odd/even symmetry", "Medium"),
    ("Functions, Limits & Continuity", "Existence of limits & asymptotic behavior", "High"),
    ("Functions, Limits & Continuity", "Continuity (types)", "High"),

    ("Ordinary Differential Calculus", "Local linear approximation & differentials", "High"),
    ("Ordinary Differential Calculus", "L'Hôpital’s Rule & indeterminate forms", "High"),
    ("Ordinary Differential Calculus", "Successive differentiation & Leibnitz theorem", "Medium"),

    ("Partial Differential Calculus", "Partial derivatives", "High"),
    ("Partial Differential Calculus", "Higher order partials & theorems", "Medium"),
    ("Partial Differential Calculus", "Chain rule for composite functions", "High"),
    ("Partial Differential Calculus", "Euler’s theorem on homogeneous functions", "High"),
    ("Partial Differential Calculus", "Jacobian & derivatives using Jacobian", "High"),

    ("Infinite Series", "Test of convergence", "High"),
    ("Infinite Series", "Taylor & Maclaurin series", "High"),

    ("Applications of Differential Calculus", "Extrema (max/min)", "High"),
    ("Applications of Differential Calculus", "Increase/decrease & concavity", "Medium"),
    ("Applications of Differential Calculus", "Cusps & vertical tangents", "Low"),

    ("Integral Calculus", "Differentiation under the integral sign", "Medium"),
    ("Integral Calculus", "Leibnitz rule", "Medium"),

    ("Multiple Integrals", "Double & triple integrals", "High"),
    ("Multiple Integrals", "Coordinate transformations (cylindrical/spherical)", "High"),

    ("Improper Integrals & Special Functions", "Improper integrals", "High"),
    ("Improper Integrals & Special Functions", "Fourier integral", "Medium"),
    ("Improper Integrals & Special Functions", "Gamma & Beta functions", "High"),
    ("Improper Integrals & Special Functions", "Dirichlet, Stirling, Bessel functions", "Low")
]

# Create DataFrame
df = pd.DataFrame(topics, columns=["Chapter", "Topic", "Priority"])

# Map priority to colors
color_map = {"High": "#ff9999", "Medium": "#fff799", "Low": "#b3ffb3"}

# Add color column
df["Color"] = df["Priority"].map(color_map)

import matplotlib.pyplot as plt
from matplotlib.table import Table

# Create figure
fig, ax = plt.subplots(figsize=(10, len(df)/2))
ax.set_axis_off()
table = Table(ax, bbox=[0, 0, 1, 1])

# Column widths
col_widths = [0.25, 0.5, 0.25]
row_height = 1 / (len(df) + 1)

# Add header
headers = ["Chapter", "Topic", "Priority"]
for i, header in enumerate(headers):
    table.add_cell(0, i, col_widths[i], row_height, text=header, loc='center', facecolor="#cccccc")

# Add rows
for row_idx, row in enumerate(df.itertuples(), start=1):
    table.add_cell(row_idx, 0, col_widths[0], row_height, text=row.Chapter, loc='center')
    table.add_cell(row_idx, 1, col_widths[1], row_height, text=row.Topic, loc='left')
    table.add_cell(row_idx, 2, col_widths[2], row_height, text=row.Priority, loc='center', facecolor=row.Color)

# Auto scale
ax.add_table(table)
plt.tight_layout()

import caas_jupyter_tools
caas_jupyter_tools.display_dataframe_to_user(name="Calculus Exam Heat Map", dataframe=df)