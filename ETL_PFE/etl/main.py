from etl.extract import run_extract
from etl.transform import run_transform
from etl.load import run_load

def main():
    extracted_data = run_extract()
    transformed_data = run_transform(extracted_data)
    run_load(transformed_data)
    print("ETL terminé avec succès.")

if __name__ == "__main__":
    main()