from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="hackare",
    version="0.1.0",
    author="hacka.re contributors",
    author_email="",
    description="Create self-contained hacka.re instances with vector-indexed content",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/hackare/hackare",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    python_requires=">=3.8",
    install_requires=[
        "click>=8.0.0",
        "numpy>=1.21.0",
        "scipy>=1.7.0",
        "sentence-transformers>=2.2.0",
        "beautifulsoup4>=4.10.0",
        "markdown>=3.4.0",
        "PyPDF2>=3.0.0",
        "requests>=2.28.0",
        "tqdm>=4.64.0",
        "jinja2>=3.1.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "black>=22.0.0",
            "flake8>=5.0.0",
            "mypy>=0.991",
        ]
    },
    entry_points={
        "console_scripts": [
            "hackare=hackare.cli:main",
        ],
    },
    include_package_data=True,
    package_data={
        "hackare": [
            "templates/*.html",
            "templates/*.js", 
            "templates/*.css",
        ],
    },
)